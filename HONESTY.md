# Honesty

We built this in a weekend with three people. Some of what you see on screen is real and some of it is a faithful sketch of where the system is heading. This file is the line between the two so you can judge the work fairly.

## What is actually working

The hardware execution side is real. Arm-01 in the Shenzhen lab accepts queued skill runs from the web app, executes them on the SO101, and streams back camera footage and joint telemetry. The wrist camera, the front camera, and the overhead realsense all come through. The fleet view counts and the live agent log are not faked.

The world model brain is real but young. We trained DINO-WM on sixty three teleop episodes that we recorded ourselves on the SO101, took the data through Modal on a single A100, and finished one full epoch with a validation loss around zero point seven three. The dataset is on Hugging Face at adrrrobo slash Hackathon2 underscore 20260606 underscore 210708 and the training scripts and the custom DINO-WM adapter for SO101 are in this repository. The model file we are pulling into the demo is a real checkpoint produced by that run.

The planner uses model predictive control in DINOv2 feature space. Current frame and goal frame are encoded once, then candidate action sequences are rolled forward through the learned predictor and ranked by feature distance to the goal. This is the actual loop, not a script.

## What is illustrative right now

The training loss curve drawn under stage two of the World Model page is shaped from the real epoch we ran but it is not a live socket to the training process. A future version will hook directly into the Modal run log so the curve updates as the experiment progresses.

The synthetic episode grid in stage one is a placeholder. Each tile is a stylized representation of one of the sixty three real episodes. We plan to swap the tiles for thumbnails decoded from the actual recorded mp4s during the next pass.

The skill brief input is wired to local state. Submitting it does not yet retrain a model. In the final loop the brief gets compiled into a goal image plus a short language description, which the planner then optimizes against.

The flywheel counter on the landing page reflects the real number of skill runs in our local log. Once we connect to the production telemetry queue it will reflect the global fleet.

## What we did not have time to do

The autoresearcher that mutates the data recipe overnight, in the spirit of Karpathy's autoresearch, is described in our docs but not yet running. We have the file scaffolding in place but the loop that would actually edit a recipe, train, evaluate, and keep wins ran out of clock.

We have not yet ported the model to a quantized variant that would let it run on the laptop alongside the web app. Inference currently happens on Modal and the planner sends actions to the arm through the execution environment.

The closed loop demo on stage uses a saved policy trained on the cube sort task. If a judge changes the bin positions during the run, the policy should still solve the task within its trained distribution. We are not yet doing live zero shot to entirely new tasks that the model has never seen.

## Choices we made on purpose

We picked DINO-WM over SANA-WM, Cosmos, and Genie Envisioner because DINO-WM conditions on robot actions while SANA-WM conditions on camera trajectories. SANA-WM is a beautiful piece of work for flying drones through generated worlds, but it does not learn how a gripper moves a cube. Predicting in DINOv2 feature space instead of pixel space gives us a smaller model, faster training, and better generalization to new visual conditions because DINOv2 already understands what objects are. The tradeoff is that we do not get pretty generated video out of the model itself. The visual demo assets you see in the deck are produced separately and we say so when we show them.

We picked Modal over self hosted infra because we did not want to spend our weekend on Kubernetes. The whole cloud bill so far is in the low double digits.

We picked LeRobot as the dataset format because it standardizes the path from teleop recording to training to deployment on the same arm. The schema is the same one that Hugging Face uses for their published robot datasets, so the door is open to fine tune on community data later.

## What to expect in the live demo

When we run the demo on stage, you will see the real arm pick up real cubes. The video on the side screen is a real recording from the wrist or overhead camera, not a generated dream. The planning happens server side and the chosen action sequence comes down to the arm as joint commands. If something looks wrong, please ask, and we will tell you exactly which part is the model and which part is fallback.

We would rather show you a smaller honest system that works than a bigger demo that pretends.
