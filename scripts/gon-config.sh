#!/usr/bin/env sh

echo "{
  \"source\" : [\"./build/bin/mac/app.app\"],
  \"bundle_id\" : \"io.datafund.fda\",
  \"apple_id\": {
    \"username\": \"$APPLE_USER\",
    \"password\": \"$APPLE_PASSWORD\"
  },
  \"sign\" :{
    \"application_identity\" : \"Apple Development: sabyasachi@datafund.io\"
  },
  \"dmg\" :{
    \"output_path\":  \"./build/bin/fda.dmg\",
    \"volume_name\":  \"Fairdrive Desktop Application\"
  }
}" > build/bin/config.json