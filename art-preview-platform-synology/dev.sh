   #!/bin/bash
   cd /volume1/web/pixcart
   export REPLICATE_API_TOKEN="r8_1x6VfXMVgHbrsnt26W7Zg5pKljXMfFK2CFTe7"
   export HOST="0.0.0.0"  # This is important to listen on all network interfaces
   npm run dev -- -H 0.0.0.0