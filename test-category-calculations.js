/**
 * Unit test for Hour Categories calculations
 * Tests the category hour calculation logic without requiring server
 */

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║     Hour Categories - Calculation Logic Test          ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Simulate the CategoryHours interface
const createCategoryHours = () => ({
  straightTime: '',
  straightTimeTravel: '',
  overtime: '',
  overtimeTravel: '',
  doubleTime: '',
  doubleTimeTravel: ''
});

// Simulate the calculateTotalFromCategories function from MultiJobTimeEntry
const calculateTotalFromCategories = (categoryHours) => {
  return (
    (parseFloat(categoryHours.straightTime) || 0) +
    (parseFloat(categoryHours.straightTimeTravel) || 0) +
    (parseFloat(categoryHours.overtime) || 0) +
    (parseFloat(categoryHours.overtimeTravel) || 0) +
    (parseFloat(categoryHours.doubleTime) || 0) +
    (parseFloat(categoryHours.doubleTimeTravel) || 0)
  );
};

// Simulate pay calculation from bulk API
const calculatePay = (categoryHours, rates) => {
  const categories = {
    STRAIGHT_TIME: parseFloat(categoryHours.straightTime) || 0,
    STRAIGHT_TIME_TRAVEL: parseFloat(categoryHours.straightTimeTravel) || 0,
    OVERTIME: parseFloat(categoryHours.overtime) || 0,
    OVERTIME_TRAVEL: parseFloat(categoryHours.overtimeTravel) || 0,
    DOUBLE_TIME: parseFloat(categoryHours.doubleTime) || 0,
    DOUBLE_TIME_TRAVEL: parseFloat(categoryHours.doubleTimeTravel) || 0,
  };

  return (
    (categories.STRAIGHT_TIME * rates.regular) +
    (categories.STRAIGHT_TIME_TRAVEL * rates.travel) +
    (categories.OVERTIME * rates.overtime) +
    (categories.OVERTIME_TRAVEL * rates.overtime) +
    (categories.DOUBLE_TIME * rates.doubleTime) +
    (categories.DOUBLE_TIME_TRAVEL * rates.doubleTime)
  );
};

// Test rates (typical for an employee)
const testRates = {
  regular: 20,      // $20/hr regular
  travel: 20,       // $20/hr travel (same as regular)
  overtime: 30,     // $30/hr overtime (1.5x)
  doubleTime: 40,   // $40/hr double time (2x)
};

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, categoryHours, expectedTotal, expectedPay) {
  console.log(`\n🧪 Test: ${testName}`);
  console.log(`   Input:`);
  console.log(`     ST: ${categoryHours.straightTime || 0}`);
  console.log(`     STT: ${categoryHours.straightTimeTravel || 0}`);
  console.log(`     OT: ${categoryHours.overtime || 0}`);
  console.log(`     OTT: ${categoryHours.overtimeTravel || 0}`);
  console.log(`     DT: ${categoryHours.doubleTime || 0}`);
  console.log(`     DTT: ${categoryHours.doubleTimeTravel || 0}`);

  const actualTotal = calculateTotalFromCategories(categoryHours);
  const actualPay = calculatePay(categoryHours, testRates);

  console.log(`   Expected total hours: ${expectedTotal}`);
  console.log(`   Actual total hours: ${actualTotal}`);
  console.log(`   Expected pay: $${expectedPay.toFixed(2)}`);
  console.log(`   Actual pay: $${actualPay.toFixed(2)}`);

  if (Math.abs(actualTotal - expectedTotal) < 0.01 && Math.abs(actualPay - expectedPay) < 0.01) {
    console.log(`   ✅ PASSED`);
    testsPassed++;
    return true;
  } else {
    console.log(`   ❌ FAILED`);
    testsFailed++;
    return false;
  }
}

// Test 1: Standard 8-hour day (all straight time)
runTest(
  'Standard 8-hour day',
  {
    straightTime: '8',
    straightTimeTravel: '',
    overtime: '',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  8.0,
  160.0  // 8 * $20
);

// Test 2: 10-hour day (8 ST + 2 OT)
runTest(
  '10-hour day with overtime',
  {
    straightTime: '8',
    straightTimeTravel: '',
    overtime: '2',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  10.0,
  220.0  // (8 * $20) + (2 * $30)
);

// Test 3: Long day (8 ST + 4 OT + 2 DT)
runTest(
  'Long day with double time',
  {
    straightTime: '8',
    straightTimeTravel: '',
    overtime: '4',
    overtimeTravel: '',
    doubleTime: '2',
    doubleTimeTravel: ''
  },
  14.0,
  360.0  // (8 * $20) + (4 * $30) + (2 * $40)
);

// Test 4: Travel day (6 ST + 2 STT)
runTest(
  'Day with travel time',
  {
    straightTime: '6',
    straightTimeTravel: '2',
    overtime: '',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  8.0,
  160.0  // (6 * $20) + (2 * $20)
);

// Test 5: Complex day (all categories)
runTest(
  'Complex day (all categories)',
  {
    straightTime: '6',
    straightTimeTravel: '1.5',
    overtime: '2',
    overtimeTravel: '0.5',
    doubleTime: '1',
    doubleTimeTravel: '0.25'
  },
  11.25,
  310.0  // (6 * $20) + (1.5 * $20) + (2 * $30) + (0.5 * $30) + (1 * $40) + (0.25 * $40)
);

// Test 6: Half-hour increments
runTest(
  'Half-hour increments',
  {
    straightTime: '7.5',
    straightTimeTravel: '0.5',
    overtime: '',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  8.0,
  160.0  // (7.5 * $20) + (0.5 * $20)
);

// Test 7: Empty/zero values
runTest(
  'Empty input (should be 0)',
  {
    straightTime: '',
    straightTimeTravel: '',
    overtime: '',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  0.0,
  0.0
);

// Test 8: Only overtime (no ST)
runTest(
  'Only overtime hours',
  {
    straightTime: '',
    straightTimeTravel: '',
    overtime: '5',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  5.0,
  150.0  // 5 * $30
);

// Test 9: Decimal precision
runTest(
  'Decimal precision (0.25 hour increments)',
  {
    straightTime: '7.75',
    straightTimeTravel: '',
    overtime: '0.25',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  8.0,
  162.5  // (7.75 * $20) + (0.25 * $30)
);

// Test 10: Real-world scenario from client
runTest(
  'Client scenario: 8 ST + 0.5 STT + 2 OT',
  {
    straightTime: '8',
    straightTimeTravel: '0.5',
    overtime: '2',
    overtimeTravel: '',
    doubleTime: '',
    doubleTimeTravel: ''
  },
  10.5,
  230.0  // (8 * $20) + (0.5 * $20) + (2 * $30)
);

// Summary
console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║                    TEST SUMMARY                        ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log(`\n   Total tests run: ${testsPassed + testsFailed}`);
console.log(`   ✅ Passed: ${testsPassed}`);
console.log(`   ❌ Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║            ✅ ALL CALCULATION TESTS PASSED              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n✅ Hour category calculations are working correctly!');
  console.log('   - Total hours calculated accurately ✓');
  console.log('   - Pay calculations correct for all categories ✓');
  console.log('   - Decimal precision maintained ✓');
  console.log('   - Edge cases handled properly ✓');
  process.exit(0);
} else {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║               ❌ SOME TESTS FAILED                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  process.exit(1);
}
