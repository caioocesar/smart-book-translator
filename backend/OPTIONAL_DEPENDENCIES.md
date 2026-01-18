# Optional Dependencies

## Natural Library

The `natural` library is an **optional dependency** used for advanced sentence tokenization in the `SentenceBatcher` service.

### Status: OPTIONAL ✅

The application **works perfectly without it**. We have a built-in regex fallback that handles sentence splitting effectively.

### Why Optional?

- **Compilation Issues**: The `natural` library requires native compilation which can fail on some systems
- **Not Critical**: Our regex-based sentence splitter works well for most use cases
- **Graceful Degradation**: The app automatically detects if `natural` is available and uses it, otherwise falls back to regex

### Installation

If you want to try installing it (optional):

**Windows PowerShell:**
```powershell
cd backend
npm install natural
```

**Linux/Mac:**
```bash
cd backend
npm install natural
```

### If Installation Fails

**Don't worry!** The application will work fine without it. You'll see this message in the logs:

```
ℹ Using built-in regex for sentence splitting (natural library not available)
```

This is completely normal and expected on many systems.

### Benefits of Having It

If successfully installed, you get:
- Slightly more accurate sentence boundary detection
- Better handling of abbreviations (Dr., Mr., etc.)
- Improved handling of complex punctuation

### Benefits of NOT Having It

- Faster startup time
- No native compilation required
- One less dependency to maintain
- Still works great for 99% of use cases

## Summary

✅ **App works without `natural`**  
✅ **Automatic fallback to regex**  
✅ **No action required if installation fails**  
✅ **Optional performance enhancement only**
