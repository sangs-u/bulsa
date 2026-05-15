// phase.js — 공사 단계 상태 기계

const PHASE = {
  current: 'pre_survey',  // pre_survey | excavation_prep | tbm | install | excavation
  flags: {
    surveyTriggered: false,
    surveyComplete:  false,
    workPlanDone:    false,
    tbmDone:         false,
    installDone:     false,
  },
  survey: {
    soilMethod:    null,  // 'quick' | 'standard'
    soilType:      null,  // 'clay' | 'sand' | 'rock'
    utilityMethod: null,  // 'gpr' | 'trial'
    utilities:     [],
    utilityFound:  false,
  },
  workPlan: {
    method:         null,  // 'slope' | 'retaining'
    depth:          null,  // 4 | 6 | 8 (m)
    safetyMeasures: [],
  },
  checklist: {
    guardrails: { done: 0, total: 4 },
    cones:      { done: 0, total: 4 },
  },
};
