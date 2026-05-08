const fs = require('fs');
const path = require('path');

// Load test data into sanxuat module for stress testing
function loadTestData() {
  const testFile = path.join(__dirname, 'data', 'sanxuat-test.json');
  const dataFile = path.join(__dirname, 'data', 'sanxuat.json');

  if (!fs.existsSync(testFile)) {
    console.log('❌ Test data file not found');
    return false;
  }

  try {
    const testData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    fs.writeFileSync(dataFile, JSON.stringify(testData, null, 2));
    console.log(`✅ Loaded ${testData.data.length} test records into sanxuat.json`);
    return true;
  } catch (error) {
    console.error('❌ Error loading test data:', error.message);
    return false;
  }
}

if (require.main === module) {
  loadTestData();
}

module.exports = { loadTestData };