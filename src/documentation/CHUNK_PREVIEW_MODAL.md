# Chunk Preview Modal Feature

## ✨ **New Feature: Click Chunks to Preview Details**

Users can now click on any chunk in the progress visualization to see complete details in a modal.

---

## 🎯 **What Was Added**

### 1. **ChunkModal Component** (`frontend/src/components/ChunkModal.jsx`)
A comprehensive modal that displays:
- **Full chunk content** (original and translated text)
- **Chunk metadata** (status, index, token count, timestamps)
- **LLM processing details** (model, duration, pipeline stages)
- **Error information** (if chunk failed)
- **Multi-chunk navigation** (when clicking on chunk group)

### 2. **Enhanced ChunkProgressBar** (`frontend/src/components/ChunkProgressBar.jsx`)
- Already had click handler (`onChunkClick`)
- Now fully integrated with modal

### 3. **Updated TranslationTab** (`frontend/src/components/TranslationTab.jsx`)
- Added state for modal and selected chunks
- Added click handler to open modal
- Integrated ChunkProgressBar and ChunkModal components

### 4. **Backend API Enhancement** (`backend/routes/translation.js`)
- Status endpoint now includes full chunk data
- Progress object includes `chunks` array with complete details

---

## 📊 **Features**

### **Chunk Metadata Display**
```javascript
{
  status: 'completed' | 'failed' | 'translating' | 'pending',
  chunk_index: 42,
  processing_layer: 'llm-enhancing' | 'translating',
  token_count: 2400,
  started_at: '2026-01-20T12:30:00Z',
  completed_at: '2026-01-20T12:30:45Z',
  duration: '45.2s'
}
```

### **LLM Processing Stats**
```javascript
{
  model: 'llama3.1:8b',
  duration: 45234,  // milliseconds
  stages: [
    { stage: 'validation', status: 'completed', duration: 15000 },
    { stage: 'rewrite', status: 'completed', duration: 30234 }
  ]
}
```

### **Full Text Preview**
- Shows complete original and translated text
- HTML formatting preserved
- Long text uses `<details>` for collapsible view
- Character count and HTML detection

### **Error Information**
- Displays error message if chunk failed
- Formatted error display with yellow background
- Helps users understand what went wrong

### **Multi-Chunk Navigation**
- When clicking on chunk group (square), shows all chunks in that group
- Previous/Next buttons to navigate
- Visual grid showing all chunks with status colors
- Click any chunk to jump to it

---

## 🎨 **UI/UX Features**

### **Modal Design**
- Modern gradient header (purple theme)
- Sticky header and footer for long content
- Scrollable content area
- Responsive design (mobile-friendly)

### **Status Colors**
- ✅ **Green** - Completed
- ❌ **Red** - Failed
- 🔄 **Blue** - Translating (1st layer)
- 🤖 **Purple** - LLM Enhancing (2nd layer)
- ⏳ **Yellow** - Pending
- ⚠️ **Orange** - Partial

### **Chunk Selector Grid**
- Visual representation of all chunks in group
- Color-coded by status
- Active chunk highlighted with border
- Hover effects for better UX
- Scrollable for large groups

### **Text Preview**
- Collapsible for long text (>500 chars)
- "Click to read full text" for user guidance
- HTML rendering with preserved formatting
- Border color indicates original (blue) vs translated (green)

---

## 🚀 **Usage**

### **For Users:**

1. **Start a translation**
2. **Watch the progress bar** fill up
3. **Click on any colored square** in the progress visualization
4. **Modal opens** showing detailed chunk information
5. **Navigate between chunks** using arrows or grid
6. **Close modal** when done

### **What Users Can See:**

#### **Completed Chunk:**
```
✅ Status: completed
📝 Original Text: "The wheel weaves as the wheel wills..."
🌐 Translated Text: "A roda tece como a roda deseja..."
🤖 LLM Processing: 
   Model: llama3.1:8b
   Duration: 45.2s
   Stages: validation (15s), rewrite (30s)
📊 Tokens: 2,400
⏱️ Started: 2026-01-20 12:30:00
✓ Completed: 2026-01-20 12:30:45
```

#### **Failed Chunk:**
```
❌ Status: failed
❌ Error: LLM output rejected: too-short(0.06)
💡 Recommendation: Switch to llama3.1:8b for HTML content
📝 Original Text: [shown]
🌐 Translated Text: [partial/incomplete]
```

#### **Active Chunk (LLM Processing):**
```
🤖 Status: llm-enhancing
🔄 Processing Layer: LLM Enhancement
📝 Original Text: [shown]
🌐 Translated Text: [being processed...]
```

---

## 💻 **Technical Implementation**

### **Frontend Data Flow:**
```
User clicks chunk square
  ↓
handleChunkClick(square) called
  ↓
setSelectedChunks(square.chunks)
  ↓
setShowChunkModal(true)
  ↓
ChunkModal renders with chunk data
  ↓
User navigates/views details
  ↓
User closes modal
  ↓
setShowChunkModal(false)
```

### **Backend Data Flow:**
```
GET /api/translation/status/:jobId
  ↓
TranslationJob.get(jobId)
  ↓
TranslationChunk.getByJob(jobId)
  ↓
Calculate progress stats
  ↓
Return { job, progress: { ..., chunks } }
  ↓
Frontend receives full chunk data
```

### **Chunk Data Structure:**
```javascript
{
  id: 'uuid',
  job_id: 'uuid',
  chunk_index: 0,
  status: 'completed',
  source_text: 'Original text...',
  translated_text: 'Translated text...',
  source_html: '<p>Original HTML...</p>',
  translated_html: '<p>Translated HTML...</p>',
  processing_layer: 'llm-enhancing',
  token_count: 2400,
  started_at: '2026-01-20T12:30:00Z',
  completed_at: '2026-01-20T12:30:45Z',
  error_message: null,
  llm_stats: {
    model: 'llama3.1:8b',
    duration: 45234,
    stages: [...]
  }
}
```

---

## 🎓 **Benefits**

### **For Users:**
1. **Transparency** - See exactly what's happening with each chunk
2. **Debugging** - Understand why chunks fail
3. **Quality Review** - Compare original vs translated text
4. **Progress Insight** - Know which chunks are done, which are pending
5. **LLM Visibility** - See which models processed each chunk

### **For Debugging:**
1. **Error Messages** - Clear error information for failed chunks
2. **Timing Data** - Identify slow chunks
3. **LLM Stats** - See which pipeline stages ran and how long
4. **Token Counts** - Verify chunk sizes
5. **Model Information** - Know which model processed each chunk

### **For Quality Assurance:**
1. **Text Comparison** - Side-by-side original and translated text
2. **HTML Preservation** - Verify formatting maintained
3. **Glossary Check** - See if terms were translated correctly
4. **Completeness** - Ensure no text was truncated

---

## 🐛 **Edge Cases Handled**

### **1. Empty Chunks**
- Modal doesn't crash if chunk data missing
- Shows "N/A" for missing metadata

### **2. Very Long Text**
- Automatically collapses text >500 characters
- "Click to read full text" indicator
- Scrollable content area

### **3. HTML Content**
- Renders HTML with formatting
- Shows "(HTML)" indicator
- Preserves all tags in preview

### **4. Failed Chunks**
- Prominent error display
- Error message formatting
- Recommendation for llama3.2:3b issues

### **5. Active/Processing Chunks**
- Shows current processing layer
- Updates in real-time via polling
- Indicates incomplete state

### **6. Large Chunk Groups**
- Scrollable chunk selector grid
- Up to 50+ chunks per group handled
- Clear navigation controls

---

## 📱 **Responsive Design**

### **Desktop (>768px):**
- Modal: 900px max width
- Metadata: 2-column grid
- Full chunk selector grid visible

### **Mobile (<768px):**
- Modal: 95vw width
- Metadata: Single column
- Chunk navigation: Full width buttons
- Optimized touch targets

---

## 🎨 **Styling**

### **CSS File:** `frontend/src/styles/ChunkModal.css`

**Key Features:**
- Modern gradient header (purple theme)
- Color-coded status indicators
- Smooth transitions and hover effects
- Custom scrollbars for better UX
- Responsive grid layouts
- Accessible focus states

**Color Scheme:**
- Primary: `#667eea` to `#764ba2` (gradient)
- Success: `#28a745`
- Error: `#dc3545`
- Warning: `#ffc107`
- Info: `#17a2b8`
- LLM: `#9c27b0` (purple)

---

## 🔧 **Customization**

### **Add Custom Fields:**

To show additional chunk data in the modal, edit `ChunkModal.jsx`:

```javascript
// Add to metadata section:
<div className="metadata-item">
  <span className="metadata-label">Your Field:</span>
  <span className="metadata-value">{selectedChunk.yourField}</span>
</div>
```

### **Change Colors:**

Edit `ChunkModal.css`:

```css
.chunk-modal .modal-header {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}
```

### **Add Filtering:**

Add filter buttons above chunk grid:

```javascript
const [statusFilter, setStatusFilter] = useState('all');
const filteredChunks = chunks.filter(c => 
  statusFilter === 'all' || c.status === statusFilter
);
```

---

## 📈 **Performance Considerations**

### **Data Transfer:**
- Status endpoint now includes chunks (~50-200KB for typical book)
- Cached in frontend state
- Only updated when polling

### **Rendering:**
- Modal only renders when open
- Text collapsed by default for long content
- Virtual scrolling for very large chunk groups (future enhancement)

### **Memory:**
- Chunks stored in progress state
- Modal state minimal (just selected chunks)
- Closed modal releases memory

---

## 🚀 **Future Enhancements**

### **Potential Additions:**

1. **Export Chunk**
   - Download individual chunk text
   - Copy to clipboard

2. **Retry Failed Chunk**
   - Retry button for failed chunks
   - Choose different model

3. **Edit Translation**
   - Inline editing of translated text
   - Save manual corrections

4. **Search Chunks**
   - Search by text content
   - Filter by status, model, etc.

5. **Statistics Dashboard**
   - Average chunk processing time
   - Model performance comparison
   - Token usage per chunk

6. **Comparison View**
   - Split-screen original vs translated
   - Highlight differences
   - Show glossary term matches

---

## 🎯 **Summary**

### **Files Modified:**
1. ✅ `frontend/src/components/ChunkModal.jsx` (NEW)
2. ✅ `frontend/src/styles/ChunkModal.css` (NEW)
3. ✅ `frontend/src/components/TranslationTab.jsx` (Modified)
4. ✅ `backend/routes/translation.js` (Modified)

### **Features Added:**
- ✅ Detailed chunk preview modal
- ✅ Multi-chunk navigation
- ✅ Full text display with collapse
- ✅ LLM processing stats
- ✅ Error information display
- ✅ Responsive design
- ✅ Real-time status updates

### **User Benefits:**
- 🎯 Better translation insight
- 🐛 Easier debugging
- 📊 Quality assurance
- 🔍 Transparency
- 🚀 Professional UX

**The chunk preview modal is now fully functional and ready to use!** 🎉
