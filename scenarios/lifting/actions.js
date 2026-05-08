// Lift action state — silently tracks what the player has done.
// Judgment ONLY at evaluateLift(). NO feedback to player during collection.

const LIFT_STATE = {
  slingInspected:  false,
  pinSecured:      false,
  specChecked:     false,
  angleMeasured:   false,
  signalAssigned:  false,
  workerEvacuated: false,
};

// Evaluated in priority order: first failure = accident
const LIFT_CHECKS = [
  { key: 'workerEvacuated', accidentId: 'worker_crush', prob: 0.95 },
  { key: 'slingInspected',  accidentId: 'sling_snap',   prob: 0.85 },
  { key: 'pinSecured',      accidentId: 'pin_drop',     prob: 0.82 },
  { key: 'angleMeasured',   accidentId: 'angle_break',  prob: 0.70 },
  { key: 'signalAssigned',  accidentId: 'no_signal',    prob: 0.55 },
];

function evaluateLift() {
  if (GAME.state.liftStarted || GAME.state.gameOver) return;
  GAME.state.liftStarted = true;
  GAME.state.phase = 2;
  updateHUD();

  exitCraneCab();
  showActionNotif('인양 시작...', 2000);

  setTimeout(() => {
    if (GAME.state.gameOver) return;
    for (const check of LIFT_CHECKS) {
      if (!LIFT_STATE[check.key] && Math.random() < check.prob) {
        triggerAccident(check.accidentId);
        return;
      }
    }
    animateLift();
  }, 1800);
}
