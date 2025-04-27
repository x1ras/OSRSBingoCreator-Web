/**
 * Main BingoBoard Component
 * Displays the full bingo board and handles all board operations
 */
const BingoBoard = {
  template: `
    <div class="bingo-container">
      <div class="controls-panel">
        <div class="board-size-control">
          <label for="board-size">Board Size:</label>
          <input type="number" id="board-size" v-model.number="boardSize" min="3" max="10" class="size-input">
          <button class="btn create-btn" @click="createBoard">Create Board</button>
        </div>
        <div class="board-actions">
          <button class="btn" @click="clearBoard">Clear Board</button>
          <button class="btn" @click="saveBoard">Save Board</button>
          <button class="btn" @click="loadBoard">Load Board</button>
        </div>
      </div>
      
      <div v-if="boardData" class="bingo-board-wrapper">
        <div class="bingo-board">
          <!-- Header row with column labels and bonuses -->
          <div class="board-row header-row">
            <div class="corner-cell"></div>
            <div v-for="col in boardSize" :key="'colHead-'+col" class="column-header">
              {{ getColumnLetter(col) }}
              <input type="number" v-model.number="columnBonuses[col-1]" min="0" class="bonus-input" @change="updateTotals">
            </div>
            <div class="corner-cell"></div>
          </div>
          
          <!-- Main board rows -->
          <div v-for="row in boardSize" :key="'row-'+row" class="board-row">
            <!-- Row header with label and bonus -->
            <div class="row-header">
              {{ row }}
              <input type="number" v-model.number="rowBonuses[row-1]" min="0" class="bonus-input" @change="updateTotals">
            </div>
            
            <!-- Bingo tiles -->
            <div v-for="col in boardSize" 
                :key="'tile-'+row+'-'+col" 
                class="bingo-tile"
                :class="{ completed: getTile(row-1, col-1).isCompleted }">
              
              <input type="text" 
                v-model="getTile(row-1, col-1).title" 
                class="tile-title" 
                :class="{ placeholder: !getTile(row-1, col-1).title }"
                placeholder="Enter Title"
                @focus="handleTextFocus"
                @blur="handleTextBlur">
              
              <div class="tile-image-container" 
                  :style="{ backgroundColor: getTile(row-1, col-1).backgroundColorRgb }"
                  @click="toggleTileCompletion(row-1, col-1)">
                <img v-if="getTile(row-1, col-1).imageUrl" 
                    :src="getTile(row-1, col-1).imageUrl" 
                    class="tile-image" 
                    @error="handleImageError">
                    
                <!-- X mark for completed tiles -->
                <div v-if="getTile(row-1, col-1).isCompleted" class="completion-x"></div>
                
                <!-- Add image button when no image -->
                <button v-if="!getTile(row-1, col-1).imageUrl" 
                        @click.stop="openImageSelector(row-1, col-1)" 
                        class="add-image-btn">
                  Add Image
                </button>
              </div>
              
              <div class="tile-footer">
                <input type="number" v-model.number="getTile(row-1, col-1).points" min="0" class="tile-points" @change="updateTotals">
                <div class="tile-actions">
                  <button @click.stop="toggleTileCompletion(row-1, col-1)" class="tile-action-btn toggle-btn">
                    {{ getTile(row-1, col-1).isCompleted ? '✓' : '◯' }}
                  </button>
                  <button @click.stop="showTileMenu(row-1, col-1)" class="tile-action-btn menu-btn">⋮</button>
                </div>
              </div>
            </div>
            
            <!-- Row total -->
            <div class="total-cell">
              <div class="total-value">{{ getRowGainedPoints(row-1) }}/{{ calculateRowTotal(row-1) }}</div>
            </div>
          </div>
          
          <!-- Footer row with column totals -->
          <div class="board-row footer-row">
            <div class="corner-cell"></div>
            <div v-for="col in boardSize" :key="'colTotal-'+col" class="total-cell">
              <div class="total-value">{{ getColumnGainedPoints(col-1) }}/{{ calculateColumnTotal(col-1) }}</div>
            </div>
            <div class="corner-cell"></div>
          </div>
        </div>
      </div>
      
      <!-- Barrows Board Modal -->
      <div v-if="showBarrowsBoard" class="modal">
        <div class="modal-content barrows-modal">
          <span class="modal-close" @click="closeBarrowsBoard">&times;</span>
          <barrows-board 
            :completion-state="currentBarrowsTile?.completionState || initializeCompletionState()"
            @completion-changed="handleBarrowsCompletion">
          </barrows-board>
        </div>
      </div>
      
      <!-- Image Selector Modal -->
      <div v-if="showImageSelector" class="modal">
        <div class="modal-content image-selector-modal">
          <span class="modal-close" @click="closeImageSelector">&times;</span>
          <div class="image-selector">
            <h2>Select an Image</h2>
            
            <div class="search-section">
              <input type="text" v-model="imageSearchQuery" placeholder="Search OSRS Wiki..." class="search-input" @keyup.enter="searchImages">
              <button @click="searchImages" class="btn">Search</button>
            </div>
            
            <div v-if="isSearching" class="loading-spinner">Searching...</div>
            
            <div v-if="searchResults.length" class="search-results">
              <div v-for="(result, index) in searchResults" 
                   :key="'result-'+index" 
                   class="search-result"
                   @click="selectImage(result.url)">
                <img :src="result.url" :alt="result.title" class="result-thumbnail">
                <div class="result-title">{{ result.title }}</div>
              </div>
            </div>
            
            <div class="or-divider">OR</div>
            
            <div class="url-section">
              <input type="text" v-model="customImageUrl" placeholder="Enter image URL..." class="url-input">
              <button @click="useCustomUrl" class="btn">Use URL</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tile Menu Modal -->
      <div v-if="showTileMenu" class="context-menu" :style="contextMenuStyle">
        <ul class="menu-list">
          <li @click="toggleTileCompletion(currentTileRow, currentTileCol)">
            {{ getTile(currentTileRow, currentTileCol).isCompleted ? 'Mark as Incomplete' : 'Mark as Complete' }}
          </li>
          <li @click="openImageSelector(currentTileRow, currentTileCol)">Change Image</li>
          <li @click="changeTileColor(currentTileRow, currentTileCol)">Change Background Color</li>
          <li @click="setBarrowsTile(currentTileRow, currentTileCol)" v-if="getTile(currentTileRow, currentTileCol).title !== 'Barrows Set'">Set as Barrows Tile</li>
          <li @click="openBarrowsTileUI(currentTileRow, currentTileCol)" v-if="getTile(currentTileRow, currentTileCol).title === 'Barrows Set'">Edit Barrows Progress</li>
          <li @click="clearTile(currentTileRow, currentTileCol)">Clear Tile</li>
        </ul>
      </div>
      
      <!-- Color Picker Modal -->
      <div v-if="showColorPicker" class="modal">
        <div class="modal-content color-picker-modal">
          <span class="modal-close" @click="closeColorPicker">&times;</span>
          <div class="color-picker">
            <h2>Choose Background Color</h2>
            <div class="color-options">
              <div v-for="(color, index) in predefinedColors" 
                   :key="'color-'+index"
                   :style="{ backgroundColor: color }" 
                   class="color-option"
                   @click="selectColor(color)"></div>
            </div>
            <div class="custom-color">
              <label for="custom-color">Custom Color:</label>
              <input type="color" id="custom-color" v-model="selectedColor">
              <button @click="selectColor(selectedColor)" class="btn">Apply</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  
  components: {
    'barrows-board': BarrowsBoard
  },
  
  data() {
    return {
      // Board configuration
      boardSize: 5,
      boardData: null,
      rowBonuses: [],
      columnBonuses: [],
      
      // Barrows board state
      showBarrowsBoard: false,
      currentBarrowsTile: null,
      currentBarrowsPosition: { row: -1, col: -1 },
      
      // Image selector state
      showImageSelector: false,
      isSearching: false,
      imageSearchQuery: '',
      customImageUrl: '',
      searchResults: [],
      currentImageTilePosition: { row: -1, col: -1 },
      
      // Tile menu state
      showTileMenu: false,
      contextMenuStyle: { top: '0px', left: '0px' },
      currentTileRow: -1,
      currentTileCol: -1,
      
      // Color picker state
      showColorPicker: false,
      selectedColor: '#ffffff',
      predefinedColors: [
        'transparent', '#ffffff', '#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9',
        '#c5cae9', '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb', '#c8e6c9',
        '#dcedc8', '#f0f4c3', '#fff9c4', '#ffecb3', '#ffe0b2', '#ffccbc'
      ]
    };
  },
  
  created() {
    // Close context menu on any click outside
    document.addEventListener('click', this.hideContextMenu);
    
    // Try to load board from localStorage on startup
    this.tryLoadFromLocalStorage();
  },
  
  beforeUnmount() {
    document.removeEventListener('click', this.hideContextMenu);
  },
  
  methods: {
    /**
     * Creates a new bingo board with the specified size
     */
    createBoard() {
      if (this.boardSize < 3 || this.boardSize > 10) {
        alert("Board size must be between 3 and 10");
        return;
      }
      
      this.boardData = [];
      this.rowBonuses = Array(this.boardSize).fill(0);
      this.columnBonuses = Array(this.boardSize).fill(0);
      
      // Initialize the board data
      for (let row = 0; row < this.boardSize; row++) {
        this.boardData[row] = [];
        for (let col = 0; col < this.boardSize; col++) {
          this.boardData[row][col] = new BingoTile(row, col);
        }
      }
    },
    
    /**
     * Gets a tile at the specified position with fallback
     */
    getTile(row, col) {
      if (!this.boardData || !this.boardData[row] || !this.boardData[row][col]) {
        return new BingoTile(row, col);
      }
      return this.boardData[row][col];
    },
    
    /**
     * Clears all data from the current board
     */
    clearBoard() {
      if (!this.boardData) {
        alert("Create a board first!");
        return;
      }
      
      if (confirm("Are you sure you want to clear the board?")) {
        // Reset all tiles but keep board structure
        for (let row = 0; row < this.boardSize; row++) {
          for (let col = 0; col < this.boardSize; col++) {
            const tile = this.boardData[row][col];
            tile.title = "";
            tile.points = 0;
            tile.imageUrl = null;
            tile.backgroundColorRgb = "transparent";
            tile.isCompleted = false;
            tile.completionState = tile.initializeCompletionState();
          }
        }
        
        // Reset bonuses
        this.rowBonuses.fill(0);
        this.columnBonuses.fill(0);
        
        // Update totals
        this.updateTotals();
      }
    },
    
    /**
     * Saves the current board to localStorage and offers download
     */
    saveBoard() {
      if (!this.boardData) {
        alert("Create a board first!");
        return;
      }
      
      // Create a board state object
      const boardState = {
        tiles: this.boardData,
        rowBonuses: this.rowBonuses,
        columnBonuses: this.columnBonuses,
        rows: this.boardSize,
        columns: this.boardSize
      };
      
      try {
        // Save to localStorage
        localStorage.setItem('osrsBingoBoard', JSON.stringify(boardState));
        
        // Also provide a download option
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(boardState));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "bingo-board.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        alert("Board saved successfully!");
      } catch (error) {
        console.error("Error saving board:", error);
        alert("Error saving board: " + error.message);
      }
    },
    
    /**
     * Loads a board from localStorage or file
     */
    loadBoard() {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              this.loadBoardFromJson(e.target.result);
            } catch (error) {
              console.error("Error parsing board file:", error);
              alert("Invalid board file");
            }
          };
          reader.readAsText(file);
        }
      };
      fileInput.click();
    },
    
    /**
     * Try to load board from localStorage on startup
     */
    tryLoadFromLocalStorage() {
      const savedBoard = localStorage.getItem('osrsBingoBoard');
      if (savedBoard) {
        try {
          this.loadBoardFromJson(savedBoard);
        } catch (error) {
          console.error("Error loading board from localStorage:", error);
        }
      }
    },
    
    /**
     * Loads a board from JSON data
     */
    loadBoardFromJson(jsonData) {
      const boardState = JSON.parse(jsonData);
      
      this.boardSize = boardState.rows;
      this.rowBonuses = boardState.rowBonuses;
      this.columnBonuses = boardState.columnBonuses;
      
      // Recreate tile objects from plain JSON
      this.boardData = [];
      for (let row = 0; row < boardState.rows; row++) {
        this.boardData[row] = [];
        for (let col = 0; col < boardState.columns; col++) {
          const jsonTile = boardState.tiles[row][col];
          const tile = new BingoTile(row, col);
          
          tile.title = jsonTile.title || "";
          tile.points = jsonTile.points || 0;
          tile.imageUrl = jsonTile.imageUrl || null;
          tile.backgroundColorRgb = jsonTile.backgroundColorRgb || "transparent";
          tile.isCompleted = jsonTile.isCompleted || false;
          
          // Handle legacy data without completionState
          if (jsonTile.completionState) {
            tile.completionState = jsonTile.completionState;
          }
          
          this.boardData[row][col] = tile;
        }
      }
      
      // Update totals after loading
      this.$nextTick(() => {
        this.updateTotals();
      });
    },
    
    /**
     * Convert column number to letter (1 = A, 2 = B, etc)
     */
    getColumnLetter(colNumber) {
      return String.fromCharCode(64 + colNumber);
    },
    
    /**
     * Calculates the total points for a row including bonus (if complete)
     */
    calculateRowTotal(row) {
      if (!this.boardData) return 0;
      
      let total = 0;
      for (let col = 0; col < this.boardSize; col++) {
        total += this.getTile(row, col).points || 0;
      }
      
      // Add bonus
      total += this.rowBonuses[row] || 0;
      
      return total;
    },
    
    /**
     * Calculates the total points for a column including bonus (if complete)
     */
    calculateColumnTotal(col) {
      if (!this.boardData) return 0;
      
      let total = 0;
      for (let row = 0; row < this.boardSize; row++) {
        total += this.getTile(row, col).points || 0;
      }
      
      // Add bonus
      total += this.columnBonuses[col] || 0;
      
      return total;
    },
    
    /**
     * Calculates points gained in a row (completed tiles + bonus if all complete)
     */
    getRowGainedPoints(row) {
      if (!this.boardData) return 0;
      
      let gained = 0;
      for (let col = 0; col < this.boardSize; col++) {
        const tile = this.getTile(row, col);
        if (tile.isCompleted) {
          gained += tile.points || 0;
        }
      }
      
      // Add bonus if row is complete
      if (this.isRowComplete(row)) {
        gained += this.rowBonuses[row] || 0;
      }
      
      return gained;
    },
    
    /**
     * Calculates points gained in a column (completed tiles + bonus if all complete)
     */
    getColumnGainedPoints(col) {
      if (!this.boardData) return 0;
      
      let gained = 0;
      for (let row = 0; row < this.boardSize; row++) {
        const tile = this.getTile(row, col);
        if (tile.isCompleted) {
          gained += tile.points || 0;
        }
      }
      
      // Add bonus if column is complete
      if (this.isColumnComplete(col)) {
        gained += this.columnBonuses[col] || 0;
      }
      
      return gained;
    },
    
    /**
     * Checks if all tiles in a row are completed
     */
    isRowComplete(row) {
      if (!this.boardData) return false;
      
      for (let col = 0; col < this.boardSize; col++) {
        if (!this.getTile(row, col).isCompleted) {
          return false;
        }
      }
      
      return true;
    },
    
    /**
     * Checks if all tiles in a column are completed
     */
    isColumnComplete(col) {
      if (!this.boardData) return false;
      
      for (let row = 0; row < this.boardSize; row++) {
        if (!this.getTile(row, col).isCompleted) {
          return false;
        }
      }
      
      return true;
    },
    
    /**
     * Toggles the completion state of a tile
     */
    toggleTileCompletion(row, col) {
      const tile = this.getTile(row, col);
      tile.isCompleted = !tile.isCompleted;
      
      // For Barrows tiles, we might want additional logic
      // ...
      
      // Update totals after toggling
      this.updateTotals();
      this.hideContextMenu();
    },
    
    /**
     * Updates all row and column totals
     */
    updateTotals() {
      // Nothing specific needed here as our calculations are reactive
      // But we could add any additional logic if needed
    },
    
    /**
     * Initialize the Barrows board completion state
     */
    initializeCompletionState() {
      const state = [];
      for (let i = 0; i < 4; i++) {
        state.push(Array(6).fill(false));
      }
      return state;
    },
    
    /**
     * Opens the Barrows board modal for a specific tile
     */
    openBarrowsTileUI(row, col) {
      const tile = this.getTile(row, col);
      
      // Only allow opening for Barrows tiles
      if (tile.title !== 'Barrows Set') {
        return;
      }
      
      this.currentBarrowsTile = tile;
      this.currentBarrowsPosition = { row, col };
      this.showBarrowsBoard = true;
      this.hideContextMenu();
    },
    
    /**
     * Closes the Barrows board modal
     */
    closeBarrowsBoard() {
      this.showBarrowsBoard = false;
      this.currentBarrowsTile = null;
      this.currentBarrowsPosition = { row: -1, col: -1 };
    },
    
    /**
     * Handles changes in the Barrows board completion state
     */
    handleBarrowsCompletion(data) {
      if (!this.currentBarrowsTile) return;
      
      const { newState, isAnyColumnComplete, completedColumn } = data;
      
      // Update the tile's completion state
      this.currentBarrowsTile.completionState = newState;
      
      // If a column is complete, update the main tile
      if (isAnyColumnComplete) {
        this.currentBarrowsTile.isCompleted = true;
        
        // Update the image to the completed barrows set
        const barrowsSetImageUrls = {
          0: "https://oldschool.runescape.wiki/images/Ahrim%27s_robes_equipped_male.png",
          1: "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png",
          2: "https://oldschool.runescape.wiki/images/Guthan%27s_armour_equipped_male.png",
          3: "https://oldschool.runescape.wiki/images/Karil%27s_armour_equipped_male.png",
          4: "https://oldschool.runescape.wiki/images/Torag%27s_armour_equipped_male.png",
          5: "https://oldschool.runescape.wiki/images/Verac%27s_armour_equipped_male.png"
        };
        
        if (barrowsSetImageUrls[completedColumn]) {
          this.currentBarrowsTile.imageUrl = barrowsSetImageUrls[completedColumn];
        }
      } else {
        this.currentBarrowsTile.isCompleted = false;
        
        // Reset to default barrows image if no column is complete
        this.currentBarrowsTile.imageUrl = "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png";
      }
      
      // Update totals
      this.updateTotals();
    },
    
    /**
     * Opens the image selector for a tile
     */
    openImageSelector(row, col) {
      this.currentImageTilePosition = { row, col };
      this.imageSearchQuery = '';
      this.customImageUrl = '';
      this.searchResults = [];
      this.showImageSelector = true;
      this.hideContextMenu();
    },
    
    /**
     * Closes the image selector
     */
    closeImageSelector() {
      this.showImageSelector = false;
      this.currentImageTilePosition = { row: -1, col: -1 };
    },
    
    /**
     * Searches for images on the OSRS Wiki
     */
    async searchImages() {
      if (!this.imageSearchQuery.trim()) {
        alert('Please enter a search query');
        return;
      }
      
      this.isSearching = true;
      this.searchResults = [];
      
      try {
        const query = encodeURIComponent(this.imageSearchQuery);
        const url = `https://oldschool.runescape.wiki/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=15&prop=pageimages&piprop=original&format=json&origin=*&gsrnamespace=0`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.query && data.query.pages) {
          // Process search results
          const results = Object.values(data.query.pages)
            .filter(page => page.original && page.original.source)
            .map(page => ({
              title: page.title,
              url: page.original.source
            }));
            
          this.searchResults = results;
          
          if (results.length === 0) {
            alert('No images found for your search query');
          }
        } else {
          alert('No results found');
        }
      } catch (error) {
        console.error('Error searching for images:', error);
        alert('Error searching for images. Please try again.');
      } finally {
        this.isSearching = false;
      }
    },
    
    /**
     * Selects an image from search results for the current tile
     */
    selectImage(imageUrl) {
      const { row, col } = this.currentImageTilePosition;
      if (row >= 0 && col >= 0) {
        const tile = this.getTile(row, col);
        tile.imageUrl = imageUrl;
        this.closeImageSelector();
      }
    },
    
    /**
     * Uses a custom URL entered by the user
     */
    useCustomUrl() {
      if (!this.customImageUrl.trim()) {
        alert('Please enter an image URL');
        return;
      }
      
      const { row, col } = this.currentImageTilePosition;
      if (row >= 0 && col >= 0) {
        const tile = this.getTile(row, col);
        tile.imageUrl = this.customImageUrl;
        this.closeImageSelector();
      }
    },
    
    /**
     * Handles image loading errors
     */
    handleImageError(event) {
      event.target.style.display = 'none';
      event.target.parentElement.classList.add('image-error');
      
      // Optionally show a placeholder or error message
      const errorSpan = document.createElement('span');
      errorSpan.className = 'image-error-text';
      errorSpan.textContent = 'Image could not be loaded';
      event.target.parentElement.appendChild(errorSpan);
    },
    
    /**
     * Shows the tile context menu
     */
    showTileMenu(row, col, event) {
      // If an event was provided, use it for positioning
      // Otherwise position near the tile
      const x = event ? event.clientX : 100;
      const y = event ? event.clientY : 100;
      
      this.contextMenuStyle = {
        top: `${y}px`,
        left: `${x}px`
      };
      
      this.currentTileRow = row;
      this.currentTileCol = col;
      this.showTileMenu = true;
      
      // Prevent default context menu
      if (event) {
        event.preventDefault();
      }
    },
    
    /**
     * Hides the context menu
     */
    hideContextMenu() {
      this.showTileMenu = false;
    },
    
    /**
     * Sets a tile as a Barrows tile
     */
    setBarrowsTile(row, col) {
      const tile = this.getTile(row, col);
      
      tile.title = "Barrows Set";
      tile.isCompleted = false;
      tile.imageUrl = "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png";
      
      // Initialize completionState if needed
      if (!tile.completionState) {
        tile.completionState = this.initializeCompletionState();
      }
      
      this.hideContextMenu();
    },
    
    /**
     * Opens the color picker for changing tile background
     */
    changeTileColor(row, col) {
      this.currentTileRow = row;
      this.currentTileCol = col;
      
      // Initialize with current color
      const tile = this.getTile(row, col);
      this.selectedColor = tile.backgroundColorRgb === 'transparent' ? '#ffffff' : tile.backgroundColorRgb;
      
      this.showColorPicker = true;
      this.hideContextMenu();
    },
    
    /**
     * Closes the color picker
     */
    closeColorPicker() {
      this.showColorPicker = false;
    },
    
    /**
     * Selects a color from the color picker
     */
    selectColor(color) {
      const tile = this.getTile(this.currentTileRow, this.currentTileCol);
      tile.backgroundColorRgb = color;
      this.closeColorPicker();
    },
    
    /**
     * Clears all data from a tile
     */
    clearTile(row, col) {
      const tile = this.getTile(row, col);
      
      tile.title = "";
      tile.points = 0;
      tile.imageUrl = null;
      tile.backgroundColorRgb = "transparent";
      tile.isCompleted = false;
      
      // Only reset completionState for non-Barrows tiles
      // For Barrows tiles, this should be handled separately
      if (tile.title !== "Barrows Set") {
        tile.completionState = this.initializeCompletionState();
      }
      
      this.hideContextMenu();
      this.updateTotals();
    },
    
    /**
     * Handles text input focus - removes placeholder if needed
     */
    handleTextFocus(event) {
      if (event.target.classList.contains('placeholder')) {
        event.target.value = '';
        event.target.classList.remove('placeholder');
      }
    },
    
    /**
     * Handles text input blur - adds placeholder if empty
     */
    handleTextBlur(event) {
      if (event.target.value === '') {
        event.target.classList.add('placeholder');
      }
    }
  }
};
