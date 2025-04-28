const BingoBoard = {
    template: `
    <div class="bingo-container">
      <div class="controls-panel">
        <div class="board-size-control">
          <label for="board-size">Board Size:</label>
          <input type="number" id="board-size" v-model.number="boardSize" min="3" max="15" class="size-input">
          <button class="btn create-btn" @click="createBoard">Create Board</button>
        </div>
        <div class="board-name-control">
          <label for="board-name">Board Name:</label>
          <input type="text" id="board-name" v-model="boardName" placeholder="Enter board name" class="name-input">
        </div>
        <!-- Password Protection Options -->
        <div class="password-controls">
          <div class="password-option">
            <div class="option-label">
              <input type="checkbox" id="enable-password" v-model="usePassword">
              <label for="enable-password">Password protect this board</label>
            </div>
            <input v-if="usePassword" type="password" v-model="boardPassword" placeholder="Set board password" class="password-input">
          </div>
          
          <div v-if="usePassword" class="password-option protection-options">
            <div class="option-label">
              <input type="checkbox" id="admin-completion" v-model="adminOnlyCompletion">
              <label for="admin-completion">Admin only tile completion</label>
              <div class="option-help">Players will need this password to mark tiles as complete</div>
            </div>
          </div>
        </div>
        <div class="board-actions">
          <button class="btn" @click="clearBoard">Clear Board</button>
          <button class="btn" @click="saveBoard">Save Board</button>
          <button class="btn" @click="loadBoard">Load Board</button>
          <button class="btn" @click="showBoardCode">Generate Code</button>
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
                :class="{ 
                  completed: getTile(row-1, col-1).isCompleted,
                  'in-completed-row': isRowComplete(row-1),
                  'in-completed-column': isColumnComplete(col-1)
                }">
              
              <input type="text" 
                v-model="getTile(row-1, col-1).title" 
                class="tile-title" 
                :class="{ placeholder: !getTile(row-1, col-1).title }"
                placeholder="Enter Title"
                @focus="handleTextFocus"
                @blur="handleTextBlur">
              
            <div class="tile-image-container"
                 :style="{ backgroundColor: getTile(row-1, col-1).backgroundColorRgb }">
              <img v-if="getTile(row-1, col-1).imageUrl"
                   :src="getTile(row-1, col-1).imageUrl"
                   class="tile-image"
                   @click.stop="handleTileImageClick(row-1, col-1)"
                   @error="handleImageError">
            
              <!-- X mark for completed tiles -->
              <div v-if="getTile(row-1, col-1).isCompleted"
                   :class="{
                     'completion-x': true,
                     'completion-x-gold': isRowComplete(row-1) || isColumnComplete(col-1)
                   }"></div>
            
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
                  <button @click.stop="showTileMenu(row-1, col-1, $event)" class="tile-action-btn menu-btn">⋮</button>
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
       
             <!-- File upload section -->
             <div class="upload-section">
               <h3>Upload Local Image</h3>
               <input type="file" id="local-image" @change="handleFileUpload" accept="image/*" class="file-input">
               <label for="local-image" class="file-label btn">Select Image File</label>
               <span v-if="uploadingImage" class="upload-status">Uploading...</span>
               <span v-if="uploadError" class="upload-error">{{ uploadError }}</span>
             </div>
       
             <div class="or-divider">OR</div>
       
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
      <div v-if="isTileMenuVisible" class="context-menu" :style="contextMenuStyle">
        <ul class="menu-list">
          <li @click="toggleTileCompletion(currentTileRow, currentTileCol)">
            {{ getTile(currentTileRow, currentTileCol).isCompleted ? 'Mark as Incomplete' : 'Mark as Complete' }}
          </li>
          
          <!-- Image related options -->
          <li class="menu-section-header">Image</li>
          <li @click="openImageSelector(currentTileRow, currentTileCol)" v-if="!getTile(currentTileRow, currentTileCol).imageUrl">Add Image</li>
          <li @click="openImageSelector(currentTileRow, currentTileCol)" v-if="getTile(currentTileRow, currentTileCol).imageUrl">Change Image</li>
          <li @click="removeTileImage(currentTileRow, currentTileCol)" v-if="getTile(currentTileRow, currentTileCol).imageUrl">Remove Image</li>
          
          <!-- Style related options -->
          <li class="menu-section-header">Style</li>
          <li @click="changeTileColor(currentTileRow, currentTileCol)">Change Background Color</li>
          
          <!-- Barrows tile specific options -->
          <li class="menu-section-header">Special Tiles</li>
          <li @click="toggleBarrowsTile(currentTileRow, currentTileCol)">
            {{ getTile(currentTileRow, currentTileCol).title === 'Barrows Set' ? 'Convert to Normal Tile' : 'Set as Barrows Tile' }}
          </li>
          <li @click="openBarrowsTileUI(currentTileRow, currentTileCol)" v-if="getTile(currentTileRow, currentTileCol).title === 'Barrows Set'">Edit Barrows Progress</li>
          
          <!-- General options -->
          <li class="menu-section-header">General</li>
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
            boardName: "Untitled Board",
            boardPassword: "",
            usePassword: false,
            adminOnlyCompletion: false,
            boardSize: 5,
            boardData: null,
            rowBonuses: [],
            columnBonuses: [],

            showBarrowsBoard: false,
            currentBarrowsTile: null,
            currentBarrowsPosition: { row: -1, col: -1 },

            showImageSelector: false,
            isSearching: false,
            imageSearchQuery: '',
            customImageUrl: '',
            searchResults: [],
            currentImageTilePosition: { row: -1, col: -1 },

            isTileMenuVisible: false,
            contextMenuStyle: { top: '0px', left: '0px' },
            currentTileRow: -1,
            currentTileCol: -1,

            showColorPicker: false,
            selectedColor: '#ffffff',
            predefinedColors: [
                'transparent', '#ffffff', '#ffcdd2', '#f8bbd0', '#e1bee7', '#d1c4e9',
                '#c5cae9', '#bbdefb', '#b3e5fc', '#b2ebf2', '#b2dfdb', '#c8e6c9',
                '#dcedc8', '#f0f4c3', '#fff9c4', '#ffecb3', '#ffe0b2', '#ffccbc'
            ],

            uploadingImage: false,
            uploadError: null,
            imgurClientId: '6bb52baf522d42f',
        };
    },

    created() {
        document.addEventListener('click', (event) => {
            if (event.target.closest('.menu-btn') || event.target.closest('.context-menu')) {
                return;
            }
            this.hideContextMenu();
        });

        this.tryLoadFromLocalStorage();
    },

    beforeUnmount() {
        document.removeEventListener('click', this.hideContextMenu);
    },

    methods: {
        createBoard() {
            if (this.boardSize < 3 || this.boardSize > 15) {
                alert("Board size must be between 3 and 15");
                return;
            }

            document.documentElement.style.setProperty('--board-size', this.boardSize);

            this.boardData = [];
            this.rowBonuses = Array(this.boardSize).fill(0);
            this.columnBonuses = Array(this.boardSize).fill(0);

            for (let row = 0; row < this.boardSize; row++) {
                this.boardData[row] = [];
                for (let col = 0; col < this.boardSize; col++) {
                    this.boardData[row][col] = new BingoTile(row, col);
                }
            }
        },

        getTile(row, col) {
            if (!this.boardData || !this.boardData[row] || !this.boardData[row][col]) {
                return new BingoTile(row, col);
            }
            return this.boardData[row][col];
        },

        clearBoard() {
            if (!this.boardData) {
                alert("Create a board first!");
                return;
            }

            if (confirm("Are you sure you want to clear the board?")) {
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

                this.rowBonuses.fill(0);
                this.columnBonuses.fill(0);

                this.updateTotals();
            }
        },

        saveBoard() {
            if (!this.boardData) {
                alert("Create a board first!");
                return;
            }

            const boardState = {
                tiles: this.boardData,
                rowBonuses: this.rowBonuses,
                columnBonuses: this.columnBonuses,
                rows: this.boardSize,
                columns: this.boardSize
            };

            try {
                localStorage.setItem('osrsBingoBoard', JSON.stringify(boardState));

                const filename = prompt("Enter a filename for your bingo board:", "bingo-board.json");

                if (filename !== null) {
                    const jsonString = JSON.stringify(boardState);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const downloadLink = document.createElement('a');
                    downloadLink.href = url;
                    downloadLink.download = filename || "bingo-board.json";

                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);

                    URL.revokeObjectURL(url);
                }
            } catch (error) {
                console.error("Error saving board:", error);
                alert("Error saving board: " + error.message);
            }
        },

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

        loadBoardFromJson(jsonData) {
            const boardState = JSON.parse(jsonData);

            this.boardSize = boardState.rows;
            this.rowBonuses = boardState.rowBonuses;
            this.columnBonuses = boardState.columnBonuses;
            document.documentElement.style.setProperty('--board-size', this.boardSize);

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

                    if (jsonTile.completionState) {
                        tile.completionState = jsonTile.completionState;
                    }

                    this.boardData[row][col] = tile;
                }
            }

            this.$nextTick(() => {
                this.updateTotals();
            });
        },

        getColumnLetter(colNumber) {
            return String.fromCharCode(64 + colNumber);
        },

        calculateRowTotal(row) {
            if (!this.boardData) return 0;

            let total = 0;
            for (let col = 0; col < this.boardSize; col++) {
                total += this.getTile(row, col).points || 0;
            }

            total += this.rowBonuses[row] || 0;

            return total;
        },

        calculateColumnTotal(col) {
            if (!this.boardData) return 0;

            let total = 0;
            for (let row = 0; row < this.boardSize; row++) {
                total += this.getTile(row, col).points || 0;
            }

            total += this.columnBonuses[col] || 0;

            return total;
        },

        getRowGainedPoints(row) {
            if (!this.boardData) return 0;

            let gained = 0;
            for (let col = 0; col < this.boardSize; col++) {
                const tile = this.getTile(row, col);
                if (tile.isCompleted) {
                    gained += tile.points || 0;
                }
            }

            if (this.isRowComplete(row)) {
                gained += this.rowBonuses[row] || 0;
            }

            return gained;
        },

        getColumnGainedPoints(col) {
            if (!this.boardData) return 0;

            let gained = 0;
            for (let row = 0; row < this.boardSize; row++) {
                const tile = this.getTile(row, col);
                if (tile.isCompleted) {
                    gained += tile.points || 0;
                }
            }

            if (this.isColumnComplete(col)) {
                gained += this.columnBonuses[col] || 0;
            }

            return gained;
        },

        isRowComplete(row) {
            if (!this.boardData) return false;

            for (let col = 0; col < this.boardSize; col++) {
                if (!this.getTile(row, col).isCompleted) {
                    return false;
                }
            }

            return true;
        },

        isColumnComplete(col) {
            if (!this.boardData) return false;

            for (let row = 0; row < this.boardSize; row++) {
                if (!this.getTile(row, col).isCompleted) {
                    return false;
                }
            }

            return true;
        },

        toggleTileCompletion(row, col) {
            const tile = this.getTile(row, col);
            tile.isCompleted = !tile.isCompleted;

            this.updateTotals();
            this.hideContextMenu();
        },

        updateTotals() {
        },

        initializeCompletionState() {
            const state = [];
            for (let i = 0; i < 4; i++) {
                state.push(Array(6).fill(false));
            }
            return state;
        },

        openBarrowsTileUI(row, col) {
            const tile = this.getTile(row, col);

            if (tile.title !== 'Barrows Set') {
                return;
            }

            this.currentBarrowsTile = tile;
            this.currentBarrowsPosition = { row, col };
            this.showBarrowsBoard = true;
            this.hideContextMenu();
        },

        closeBarrowsBoard() {
            this.showBarrowsBoard = false;
            this.currentBarrowsTile = null;
            this.currentBarrowsPosition = { row: -1, col: -1 };
        },

        handleBarrowsCompletion(data) {
            if (!this.currentBarrowsTile) return;

            const { newState, isAnyColumnComplete, completedColumn } = data;

            this.currentBarrowsTile.completionState = newState;

            if (isAnyColumnComplete) {
                this.currentBarrowsTile.isCompleted = true;

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

                this.currentBarrowsTile.imageUrl = "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png";
            }

            this.updateTotals();
        },

        openImageSelector(row, col) {
            this.currentImageTilePosition = { row, col };
            this.imageSearchQuery = '';
            this.customImageUrl = '';
            this.searchResults = [];
            this.uploadError = null;
            this.showImageSelector = true;
            this.hideContextMenu();
        },

        closeImageSelector() {
            this.showImageSelector = false;
            this.currentImageTilePosition = { row: -1, col: -1 };
        },

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

        selectImage(imageUrl) {
            const { row, col } = this.currentImageTilePosition;
            if (row >= 0 && col >= 0) {
                const tile = this.getTile(row, col);
                tile.imageUrl = imageUrl;
                this.closeImageSelector();
            }
        },

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

        handleImageError(event) {
            event.target.style.display = 'none';
            event.target.parentElement.classList.add('image-error');

            const errorSpan = document.createElement('span');
            errorSpan.className = 'image-error-text';
            errorSpan.textContent = 'Image could not be loaded';
            event.target.parentElement.appendChild(errorSpan);
        },

        showTileMenu(row, col, event) {
            if (!event) {
                event = {
                    clientX: 100,
                    clientY: 100
                };
            }

            this.currentTileRow = row;
            this.currentTileCol = col;

            this.$nextTick(() => {
                this.isTileMenuVisible = true;

                const x = event.clientX + 5;
                const y = event.clientY + 5;

                this.contextMenuStyle = {
                    top: `${y}px`,
                    left: `${x}px`,
                    visibility: 'hidden'
                };

                this.$nextTick(() => {
                    const menuEl = document.querySelector('.context-menu');
                    if (menuEl) {
                        const menuHeight = menuEl.offsetHeight;
                        const menuWidth = menuEl.offsetWidth;
                        const windowHeight = window.innerHeight;
                        const windowWidth = window.innerWidth;

                        let topPos = y;
                        if (y + menuHeight > windowHeight) {
                            topPos = Math.max(10, y - menuHeight);
                        }

                        let leftPos = x;
                        if (x + menuWidth > windowWidth) {
                            leftPos = Math.max(10, x - menuWidth);
                        }

                        this.contextMenuStyle = {
                            top: `${topPos}px`,
                            left: `${leftPos}px`,
                            visibility: 'visible'
                        };
                    }
                });
            });

            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
        },

        hideContextMenu() {
            console.log('Hiding context menu');
            this.isTileMenuVisible = false;
        },

        removeTileImage(row, col) {
            const tile = this.getTile(row, col);
            tile.imageUrl = null;
            this.hideContextMenu();
        },

        toggleBarrowsTile(row, col) {
            const tile = this.getTile(row, col);

            if (tile.title === "Barrows Set") {
                tile.title = "";
                tile.completionState = this.initializeCompletionState();
            } else {
                tile.title = "Barrows Set";
                tile.isCompleted = false;
                tile.imageUrl = "https://oldschool.runescape.wiki/images/Dharok%27s_armour_equipped_male.png";

                tile.completionState = this.initializeCompletionState();
            }

            this.hideContextMenu();
        },

        changeTileColor(row, col) {
            this.currentTileRow = row;
            this.currentTileCol = col;

            const tile = this.getTile(row, col);
            this.selectedColor = tile.backgroundColorRgb === 'transparent' ? '#ffffff' : tile.backgroundColorRgb;

            this.showColorPicker = true;
            this.hideContextMenu();
        },

        closeColorPicker() {
            this.showColorPicker = false;
        },

        selectColor(color) {
            const tile = this.getTile(this.currentTileRow, this.currentTileCol);
            tile.backgroundColorRgb = color;
            this.closeColorPicker();
        },

        handleTileImageClick(row, col) {
            const tile = this.getTile(row, col);

            if (tile.title === 'Barrows Set') {
                this.openBarrowsTileUI(row, col);
            }
        },

        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                this.uploadError = 'Selected file is not an image.';
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                this.uploadError = 'Image file size must be less than 10MB.';
                return;
            }

            this.uploadingImage = true;
            this.uploadError = null;

            try {
                const base64Image = await this.fileToBase64(file);

                const response = await fetch('https://api.imgur.com/3/image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Client-ID ${this.imgurClientId}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: base64Image.split(',')[1],
                        type: 'base64'
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.data.error || 'Failed to upload image');
                }

                this.selectImage(data.data.link);

            } catch (error) {
                console.error('Error uploading to Imgur:', error);
                this.uploadError = `Error uploading: ${error.message}`;
            } finally {
                this.uploadingImage = false;
                event.target.value = '';
            }
        },

        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        },

        async generateBoardCode() {
            if (!this.boardData) {
                alert("Create a board first!");
                return null;
            }

            const boardState = {
                boardName: this.boardName,
                tiles: this.boardData,
                rowBonuses: this.rowBonuses,
                columnBonuses: this.columnBonuses,
                rows: this.boardSize,
                columns: this.boardSize
            };

            return await this.storeAndGetShortCode(boardState);
        },

        async storeAndGetShortCode(boardState) {
            boardState.passwordProtected = this.usePassword;

            if (this.usePassword && this.boardPassword) {
                const passwordHash = this.hashPassword(this.boardPassword);
                boardState.passwordHash = passwordHash;

                boardState.adminOnlyCompletion = this.adminOnlyCompletion;
            } else {
                boardState.adminOnlyCompletion = false;
            }

            const generateId = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < 12; i++) {
                    result += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return result;
            };

            const timestamp = Date.now().toString(36);
            const shortCode = generateId() + timestamp.slice(-6);

            try {
                const response = await fetch('/api/save-board', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: shortCode,
                        boardData: boardState
                    })
                });

                if (!response.ok) {
                    throw new Error('API request failed');
                }

                return shortCode;
            } catch (error) {
                console.error("API error:", error);
                console.log("Falling back to localStorage");

                localStorage.setItem('bingoboard_' + shortCode, JSON.stringify(boardState));
                return shortCode;
            }
        },

        async showBoardCode() {
            try {
                const code = await this.generateBoardCode();
                if (code) {
                    const modalDiv = document.createElement('div');
                    modalDiv.className = 'modal';
                    modalDiv.style.display = 'block';

                    modalDiv.innerHTML = `
                <div class="modal-content code-modal">
                    <span class="modal-close">&times;</span>
                    <h2>Board Code</h2>
                    <p>Share this code with players:</p>
                    <div class="code-display-container">
                        <input type="text" value="${code}" class="code-display" readonly>
                        <button class="btn copy-btn">Copy</button>
                    </div>
                </div>
            `;

                    document.body.appendChild(modalDiv);

                    const closeBtn = modalDiv.querySelector('.modal-close');
                    closeBtn.addEventListener('click', () => {
                        document.body.removeChild(modalDiv);
                    });

                    const copyBtn = modalDiv.querySelector('.copy-btn');
                    const codeDisplay = modalDiv.querySelector('.code-display');
                    copyBtn.addEventListener('click', () => {
                        codeDisplay.select();
                        document.execCommand('copy');
                        copyBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            copyBtn.textContent = 'Copy';
                        }, 2000);
                    });
                }
            } catch (error) {
                console.error("Error generating code:", error);
                alert("There was an error generating the board code. Please try again.");
            }
        },
        
        hashPassword(password) {
            let hash = 0;
            if (password.length === 0) return hash;
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        }
    }
}