# Citation Monitor - Setup

```bash
chmod +x start.sh
./start.sh
```

That's it. The script handles everything automatically (Python venv, dependencies, server). Opens in your browser at http://localhost:49292.

To stop: press Ctrl+C or run `lsof -ti:49292 | xargs kill`.
