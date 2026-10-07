import { exposureMasks, exposedWetness } from './exposure';
import { Experiment, type Conditions, FIXED_STEP_SECONDS } from './model';
self.onmessage = (event: MessageEvent<Conditions>) => {
  const slow = new Experiment({ ...event.data, speedMetersPerSecond: 1.5 });
  const fast = new Experiment({ ...event.data, speedMetersPerSecond: 3 });
  slow.start();
  fast.start();
  const traces: {
    distanceMeters: number;
    wetFraction: number;
    volumeMilliliters: number;
    timeSeconds: number;
    coverageFraction: number;
    reachableFraction: number;
  }[][] = [[], []];
  for (const [index, experiment] of [slow, fast].entries()) {
    const masks = exposureMasks(
      experiment.parts,
      experiment.faces,
      experiment.conditions,
    );
    traces[index].push({
      ...experiment.summary(),
      ...exposedWetness(experiment.faces, masks),
    });
    let nextSample = Math.max(0.5, event.data.distanceMeters / 100);
    while (experiment.running) {
      experiment.step(FIXED_STEP_SECONDS);
      if (experiment.distanceMeters >= nextSample || !experiment.running) {
        traces[index].push({
          ...experiment.summary(),
          ...exposedWetness(experiment.faces, masks),
        });
        nextSample += Math.max(0.5, event.data.distanceMeters / 100);
        self.postMessage({
          traces,
          progress:
            (index +
              experiment.distanceMeters /
                Math.max(1, event.data.distanceMeters)) /
            2,
          done: false,
        });
      }
    }
    if (experiment.error) {
      self.postMessage({ error: experiment.error });
      return;
    }
  }
  self.postMessage({ traces, done: true, progress: 1 });
};
