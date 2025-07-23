const { saveConfig } = require('/utils/configManager');
const fs = require('fs');

const migratePlaintext = (fileName) => {
  const data = JSON.parse(fs.readFileSync(fileName));
  saveConfig(fileName, data);
  console.log(`✅ Migrated and encrypted ${fileName}`);
};

migratePlaintext('dbConfig.json');
migratePlaintext('smtpConfig.json');
migratePlaintext('featureConfig.json');
