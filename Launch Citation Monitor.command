#!/bin/bash
# Double-click this file to start Citation Monitor.
cd "$(dirname "$0")"
./start.sh
echo ""
echo "Server is running. Close this window when you're done to stop the server."
echo "Or press Ctrl+C."
# Keep the terminal window open so the user can read the output
wait
