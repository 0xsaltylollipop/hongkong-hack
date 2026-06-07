# DINO-WM for the SO101 cube sort task

This document captures everything we did to bring DINO-WM into our hackathon stack. The goal was a working world model on top of the SO101 teleop data so the robot could plan against goal images rather than be retrained for every new task.

## Why we chose DINO-WM

We looked at the obvious candidates first. SANA-WM is beautiful but conditions on camera trajectories rather than robot actions, so the model knows how a drone would fly through the scene but nothing about how a gripper moves a cube. Cosmos and Genie Envisioner are closer in spirit but the weights are massive and inference is slow enough that we could not have run the planning loop in real time during the demo. OneRobot is closed.

DINO-WM hits a much more practical point on the curve. It freezes a pretrained DINOv2 encoder and only learns a small predictor on top, which means a single GPU and a few minutes of training gets us something useful. The model predicts the next visual feature given the current feature and an action, and we plan by rolling out candidate action sequences in feature space and picking the one whose final feature is closest to a goal image. No reward shaping, no per task retraining. Show the model a new goal image and it tries to reach it.

The pitch lands cleanly. Cosmos predicts pixels, which is slow and brittle. DINO-WM predicts the semantic features a robot actually needs, and it inherits internet scale generalization from DINOv2 for free. Train once, swap goals at runtime, deploy on a three hundred dollar arm.

## What our data looks like

The teleop sessions live on Hugging Face as a standard LeRobotDataset at `adrrrobo/Hackathon2_20260606_210708`. There are sixty three episodes, around sixty nine thousand frames at thirty FPS, six dimensional joint actions and six dimensional joint states. Three cameras are recorded for each frame. The front camera is a regular RGB stream, the wrist camera rides on the gripper, and the realsense camera is mounted overhead and gives us the top down view of the workspace.

We picked the realsense top down view as the primary observation. The arm, the cubes, and the bins all sit in frame at the same time, so the spatial relationships the policy needs are visible in a single image. The other two cameras stay in the dataset and we can swap them in later if we want a multi view variant.

## From LeRobot to DINO-WM on disk

The DINO-WM training loop expects a particular file layout that comes from the PushT example. We mirrored that layout for SO101. The script `convert_lerobot_to_dinowm.py` reads the Hugging Face dataset, pads each episode to the longest length, and writes four artifacts to `data/so101`. There is a `states.pth` tensor with shape `(63, T_max, 6)`, an `abs_actions.pth` tensor of the same shape, a `rel_actions.pth` variant containing per step deltas, and a `seq_lengths.pkl` list so the loader can tell where real data ends and padding begins. Per episode video clips get re encoded into `data/so101/obses/episode_XXX.mp4` so the decord based loader can grab specific frames quickly.

The resulting directory is about two hundred megabytes, which fits comfortably on a Modal volume.

## A custom dataset adapter

Plugging this into DINO-WM took two small extensions. The first is `SO101Dataset` in `dino_wm/datasets/so101_dset.py`. It mirrors `PushTDataset` closely so anything that worked on PushT still works for us. Loading is straightforward. Read the tensors, normalize actions and states against per dimension mean and standard deviation computed over the non padded frames only, and expose `action_dim`, `state_dim`, and `proprio_dim` so the rest of DINO-WM can build the model without surprises.

There were two small traps along the way. Decord returns tensors that share memory with its internal buffer, which collides with PyTorch DataLoader's collation step when shared memory regions need to be resized. We sidestepped this by switching the decord bridge to native NumPy arrays and explicitly copying the result into a fresh torch tensor. The other trap was the loader return order. DINO-WM's train loop unpacks the call site as `datasets, traj_dsets = hydra.utils.call(...)` and uses the first dictionary for the dataloader. PushT returns sliced data first and the full episodes second, and we initially had the order reversed. Once we matched PushT the slicer started producing fixed length windows the way the rest of the codebase expects.

The second extension is `SO101SlicerDataset`. The original `TrajSlicerDataset` is fine for PushT because PushT episodes are short. Our episodes are roughly twenty times longer, so when the slicer asked the dataset for episode `i`, our `__getitem__` was decoding more than a thousand frames just to throw away all but four of them. The custom slicer only decodes the four frames that actually feed into the model and reads actions and states directly from the in memory tensors. The change took a single epoch from impossibly slow to about a minute per batch and ultimately about an hour per epoch on a single A100.

## Configuration

Two new Hydra files glue everything together. `dino_wm/conf/env/so101.yaml` points the data loader at `data/so101` and wires in the default image transform. `dino_wm/conf/train_so101.yaml` mirrors the PushT training config and bumps the epoch count and batch size to sensible defaults. Number of history frames stays at three and number of predicted frames stays at one, which means each training sample spans `4 frames * frameskip` raw frames, or roughly one and a third seconds at frameskip ten. That is enough for the model to see a pick or a place motion without making the windows so long that the predictor blurs out.

## Running training on Modal

The training script wraps a Modal function that mounts the dino_wm source, attaches a persistent volume for the converted dataset, and another volume for checkpoints. `modal_train.py::upload_data` streams the local `data/so101` folder up to the volume using Modal's batch upload context manager, which avoids the hundred megabyte function argument cap. The training entrypoint kicks off `python train.py` inside the container with our config overrides. The image runs Weights and Biases in offline mode so the run does not require auth and still writes useful logs into the checkpoint folder.

We deliberately took an aggressive shortcut for the first run. The decoder is turned off so we are only training the predictor and the small action and proprio encoders. The decoder is only useful for visualizing what the world model imagines as a pixel image, and we already know we want the planner to compare features, not pixels. Skipping it makes the run roughly three times faster.

The first end to end training pass took about sixty three minutes per epoch on an A100. Training loss after epoch one was around one point one, validation loss around zero point seven three. The numbers themselves are not a finished result. What they tell us is that the predictor is reading features in a consistent way, the dataset is producing sane batches, and the model has begun to learn the dynamics. The pipeline works, which was the bottleneck.

## A bug we hit on save

The very first run died right at the end of epoch one with `KeyError: decoder_optimizer`. The reason is small but worth recording. The base training script builds a list of object keys it intends to checkpoint, and when `train_decoder` is true it tacks on `decoder` and `decoder_optimizer`. The optimizer only gets instantiated when `has_decoder` is true as well, so disabling the decoder via the command line override created a mismatch. We patched the save loop to skip any key that is missing from the trainer's dict, which lets `has_decoder=false` runs save cleanly while leaving the normal path untouched.

## Where this slots into the broader plan

The DINO-WM checkpoint is the brain. By itself it does nothing on a real arm. The next step is the planning loop, which takes a current camera frame and a goal image, encodes both into features, samples candidate action sequences, rolls them out through the predictor, and picks the sequence whose imagined final feature is closest to the goal. We will run this against a held out subset of teleop episodes first to make sure the success rate is reasonable, and only then push the chosen action sequences to the actual SO101 over the LeRobot deployment loop.

If we get more time, the autoresearch loop sits on top of all of this. It mutates the hyperparameters that govern training and planning, runs short evaluation passes, and keeps the recipes that improve success rate. Karpathy's autoresearch is the prior art here, but the target is robot policy quality instead of language model bits per byte.

## Quick reproduction guide

The end to end recipe is short.

```bash
uv sync
uv run convert_lerobot_to_dinowm.py
uv run modal token new
uv run modal run modal_train.py::upload_data
uv run modal run --detach modal_train.py::train --epochs 1
uv run modal run modal_train.py::pull_ckpts
```

The first three commands prepare the local environment and the data. The fourth pushes the dataset to Modal once. The fifth runs detached on an A100 so the training process survives if your local shell drops, and the last one copies the checkpoint files back to your machine so you can plug them into the planner.

## Honest notes on quality

One epoch with the decoder off and frameskip ten is enough to validate the pipeline and not much more. We expect roughly thirty to fifty percent task success in the first runs of the planner. To push the demo into the sixty to eighty percent range we will need at least twenty more epochs and probably a longer frame history. The reason to write all of this down now is that the next time we kick off training, we can fan out variants in parallel and compare them instead of fighting the same plumbing again.
