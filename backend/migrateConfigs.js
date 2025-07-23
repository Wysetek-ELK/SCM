const path = require('path');
const backendPath = path.join(__dirname, '../case-management-backend/');
const { saveConfig } = require(backendPath + 'utils/configManager');
const fs = require('fs');

const migratePlaintext = (fileName) => {
  const fullPath = path.join(backendPath, fileName);
  const data = JSON.parse(fs.readFileSync(fullPath));
  saveConfig(fileName, data);
  console.log(`✅ Migrated and encrypted ${fileName}`);
};

migratePlaintext('dbConfig.json');
migratePlaintext('smtpConfig.json');
migratePlaintext('featureConfig.json');
