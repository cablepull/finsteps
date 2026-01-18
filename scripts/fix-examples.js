// Script to update all examples to use DSL-driven navigation
// This generates the bindings for each example

const fs = require('fs');
const path = require('path');

const examples = [
  { name: 'state', steps: ['overview', 'idle', 'waiting', 'active', 'error'] },
  { name: 'er', steps: ['overview', 'customer', 'order', 'orderitem', 'product'] },
  { name: 'pie', steps: ['overview', 'desktop', 'mobile', 'tablet', 'other'] },
  { name: 'journey', steps: ['overview', 'landing', 'signup', 'pricing', 'tour', 'dashboard'] },
  { name: 'gitgraph', steps: ['overview', 'Setup', 'Initial', 'Feature A', 'Feature B', 'Feature C', 'Release'] },
  { name: 'block', steps: ['overview', 'nodeA', 'nodeB', 'nodeC', 'nodeD'] },
  { name: 'quadrant', steps: ['overview', 'leader', 'challenger', 'niche', 'innovator'] },
  { name: 'requirement', steps: ['overview', 'req1', 'req2', 'func1'] },
  { name: 'timeline-experimental', steps: ['overview', 'major', 'recent'] },
  { name: 'c4container', steps: ['overview', 'webapp', 'api', 'db'] },
  { name: 'c4context', steps: ['overview', 'user', 'webapp', 'auth'] }
];

examples.forEach(example => {
  console.log(`\n=== ${example.name} ===`);
  example.steps.forEach(stepId => {
    console.log(`          { event: "click", target: { selector: "button[data-goto='${stepId}']" }, actions: [{ type: "nav.goto", payload: { id: "${stepId}" } }] },`);
  });
});
