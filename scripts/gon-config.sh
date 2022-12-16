#!/usr/bin/env sh

echo "{
  \"source\" : [\"./build/bin/mac/Fairdrive Desktop App.app\"],
  \"bundle_id\" : \"io.fairdatasociety.fda\",
  \"notarize\": [{
    \"path\": \"./build/bin/fairdrive.dmg\",
    \"bundle_id\": \"io.fairdatasociety.fda\",
    \"staple\": true
  }],
  \"apple_id\": {
    \"username\": \"$APPLE_USER\",
    \"password\": \"$APPLE_PASSWORD\"
  },
  \"sign\" :{
    \"application_identity\" : \"$ID\",
    \"entitlements_file\" : \"./build/darwin/entitlements.plist\"
  },
  \"dmg\" :{
    \"output_path\":  \"./build/bin/fairdrive.dmg\",
    \"volume_name\":  \"Fairdrive Desktop Application\"
  }
}" > build/bin/config.json