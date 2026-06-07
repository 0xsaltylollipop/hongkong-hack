# HONESTY.md

> Mandatory disclosure for the hackathon. This file lives at the root of your repository. Judges cross-check it against your code and your technical video.
>
> **The deal:** disclosed shortcuts are **not** penalized — that is the entire point of this file. Hidden ones are. Undisclosed pre-built code is heavily penalized, each undisclosed mock carries a small penalty, and a faked demo is heavily penalized. Telling the truth here costs you nothing.

---

## 1. Team — who did what

| Member | GitHub handle | Main contributions |
|---|---|---|
| Jan |  | Web app (TENDON), fleet view, telemetry bar, world model page layout, agent log component |
| Kenny | nguyenbakenny | Hardware execution backend (`hwexec/`), SO101 teleop capture, dataset upload to Hugging Face |
| Mohanad | mkandil | DINO-WM world model pipeline, dataset adapter, Modal training infra, HONESTY + DINO docs |

---

## 2. What is fully working

- **SO101 teleop capture + dataset publishing.** Sixty three real episodes recorded on Arm-01 in the lab, pushed to Hugging Face at `adrrrobo/Hackathon2_20260606_210708` in LeRobot v3 schema, three cameras (front, wrist, realsense) per frame, six dimensional joint actions and states. The dataset is public and a fresh clone reproduces our training input exactly.
- **LeRobot to DINO-WM data converter.** `convert_lerobot_to_dinowm.py` reads the Hugging Face dataset, writes `states.pth`, `abs_actions.pth`, `rel_actions.pth`, `seq_lengths.pkl`, and per episode mp4s in the layout DINO-WM's loader expects. Runs in a few minutes on a Macbook.
- **Custom DINO-WM adapter for SO101.** `dino_wm/datasets/so101_dset.py` plus `dino_wm/conf/env/so101.yaml` and `dino_wm/conf/train_so101.yaml`. Includes a custom `SO101SlicerDataset` that only decodes the frames it actually needs (without it, training was decoding more than a thousand frames per sample).
- **Modal training pipeline.** `modal_train.py` provisions an A100, mounts persistent volumes for the dataset and checkpoints, and runs DINO-WM training with Weights and Biases in offline mode. One full epoch on the real data produced a training loss around 1.12 and a validation loss around 0.73.
- **Hardware execution backend.** `hwexec/` exposes a controller, an agent runner, and a safety layer that talks to the SO101 over LeRobot. The web app queues skill runs against this backend.
- **Web app navigation, landing, fleet, dashboard, skills, world model pages.** Real React + Vite + Tailwind app, served from `web/`. The flywheel counter, the live agent log component, and the world model KPIs are wired to real numbers from our run.

---

## 3. What is mocked, stubbed, or hardcoded

| What is faked | Where (file:line or folder) | Why we mocked it | What the real version would do |
|---|---|---|---|
| Loss curve on World Model page | `web/src/pages/WorldModel.tsx` (the `loss-svg` path) | Shaped to match our real epoch one curve, not a live socket | Stream `results.tsv` from the Modal volume into a live chart |
| Episode grid (`EpGrid`) on World Model page | `web/src/pages/WorldModel.tsx` lines 6 to 34 | Stylized SVG, not actual frames from the recorded mp4s | Decode thumbnails from `data/so101/obses/episode_*.mp4` and stream them to the page |
| Skill brief input | `web/src/pages/WorldModel.tsx` `setBrief` state | Wired to local state only; submit does not retrain anything | Compile the brief to a goal image plus language description, dispatch to the planner |
| Synthetic episode generation language in stage one copy was rewritten | `web/src/pages/WorldModel.tsx` stage 01 text | We deliberately replaced "synthetic" with "real episodes" because we did not actually generate synthetic episodes this hackathon | Run a real synthetic generator (DREMA-style equivariant augmentation) and report the true ratio |
| Closed loop planner on stage demo | not yet wired | Out of time to merge the planner into the web app | MPC in DINOv2 feature space using the real DINO-WM checkpoint, candidate action sequences scored against a goal image |
| Autoresearcher loop | scaffolded only, not run | Time | Karpathy-style mutate-recipe loop that edits `generate.py` knobs and keeps wins overnight |
| SANA-WM dream video on demo screen (if shown) | generated separately, not from our model | Visual eye candy | Real action-conditioned future video from the trained DINO-WM decoder (we trained without the decoder for speed) |

---

## 4. External APIs, services & data sources

| Service / API / dataset | Used for | Real call or mocked? | Auth (sandbox / test key / none) |
|---|---|---|---|
| Hugging Face Hub | Hosting our recorded SO101 dataset and downloading DINOv2 weights | Real | User access token, free tier |
| Modal | Cloud GPU for DINO-WM training, persistent volumes for dataset and checkpoints | Real | Personal account, paid credit |
| DINOv2 (Meta, `dinov2_vits14`) | Frozen visual encoder inside DINO-WM | Real, weights downloaded from `dl.fbaipublicfiles.com` on first run | None required |
| NVlabs SANA-WM | Attempted visual demo asset (camera flythrough of our scene) | Build attempted, not landed at submission time | Hugging Face token to fetch checkpoints |
| Luma Dream Machine | Fallback visual demo asset if SANA-WM did not land | UI based, no API | Free trial |
| Weights and Biases | Training metrics logging | Real, offline mode (no upload) | None required |
| LeRobot SDK (Hugging Face) | Dataset format, dataloader, robot driver | Real, used as installed Python package | None required |

---

## 5. Pre-existing code

| Item | Source (URL or description) | Roughly how much | License |
|---|---|---|---|
| DINO-WM training repo | https://github.com/gaoyuezhou/dino_wm | Whole repo cloned into `dino_wm/` then modified: new dataset class, new Hydra configs, patched `save_ckpt` to skip missing optimizer keys, custom slicer | MIT |
| NVlabs SANA | https://github.com/NVlabs/Sana | Cloned inside the Modal image for SANA-WM inference, no local modifications | Apache 2.0 |
| LeRobot | https://github.com/huggingface/lerobot | Installed as a dependency, not modified | Apache 2.0 |
| shadcn/ui components | https://ui.shadcn.com/ | Used as the base for buttons, cards, and form controls under `web/src/components/ui/` | MIT |
| Tailwind CSS + Vite + React Router scaffolding | Standard Vite React TypeScript template | Project skeleton only, no pages or business logic carried over | MIT |
| TENDON web app shell (TopBar, Landing, Fleet, Dashboard, Skills layout) | Written during the hackathon, no prior personal project | All custom | n/a |

---

## 6. Known limitations & next steps

- One epoch is not enough. Validation loss of 0.73 proves the pipeline works but the planner will need at least twenty more epochs to drive task success on real hardware into the sixty to eighty percent range. The save bug killed the first run after epoch one; the patched version finished a usable checkpoint on the second run.
- The planner is not yet wired into the web app. Locally we can encode a goal image, roll forward in DINO-WM feature space, and pick action sequences, but the user facing "Run on Arm-01" button still routes to the dashboard rather than triggering a new MPC plan.
- We turned the decoder off during training to ship faster. Re-training with the decoder would let us show generated future frames as pretty visuals, not just feature space rollouts.
- The autoresearcher loop has a scaffold (`generate.py`, `program.md`, `run_trial.sh`) but did not run overnight. The next pass would let it discover the best data recipe automatically.
- We have not yet tested zero shot generalization to completely new tasks the model never saw. The stage demo uses the cube sort task within the trained distribution. Bin position changes and color swaps should still work; entirely new manipulations probably will not.
- SANA-WM as a visual demo asset is risky to set up in 15 minutes. If it does not land we will use Luma Dream Machine instead and we will say so on stage.
