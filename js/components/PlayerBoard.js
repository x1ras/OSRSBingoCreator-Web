const PlayerBoard = {
    template: `
    <div class="bingo-container player-mode">
      <div class="player-controls">
        <div class="board-info">
          <h2>{{ boardName }}</h2>
          <div class="board-stats">
            <div class="board-stat">Size: {{ boardSize }}×{{ boardSize }}</div>
            <div class="board-stat">Available Points: {{ totalAvailablePoints }}</div>
          </div>
          <!-- Admin lock status indicator -->
          <div v-if="adminOnlyCompletion" class="admin-status">
            <div class="admin-status-indicator" :class="{ 'admin-unlocked': isAdmin }">
              {{ isAdmin ? 'Admin Mode' : 'Locked' }}
            </div>
            <button v-if="!isAdmin" class="btn admin-unlock-btn" @click="showAdminLogin = true">Admin Unlock</button>
            <button v-else class="btn admin-lock-btn" @click="isAdmin = false">Lock</button>
            <button v-if="canSaveBoard()" class="btn save-progress-btn" @click="saveProgress">Save Progress</button>
          </div>
        </div>
        <div class="progress-summary">
          <div class="points-display">Earned Points: {{ getTotalPoints() }}</div>
        </div>
      </div>
      
      <div v-if="boardData" class="bingo-board-wrapper">
        <div class="bingo-board">
          <!-- Header row with column labels and bonuses -->
          <div class="board-row header-row">
            <div class="corner-cell"></div>
            <div v-for="col in boardSize" :key="'colHead-'+col" class="column-header">
              {{ getColumnLetter(col) }}
              <div class="bonus-value">+{{ columnBonuses[col-1] }}</div>
            </div>
            <div class="corner-cell"></div>
          </div>
          
          <!-- Main board rows -->
          <div v-for="row in boardSize" :key="'row-'+row" class="board-row">
            <!-- Row header with label and bonus -->
            <div class="row-header">
              {{ row }}
              <div class="bonus-value">+{{ rowBonuses[row-1] }}</div>
            </div>
            
             <!-- Bingo tiles (read-only version) -->
             <div v-for="col in boardSize"
                 :key="'tile-'+row+'-'+col"
                 class="bingo-tile player-tile"
                 :class="{
                   completed: getTile(row-1, col-1).isCompleted,
                   'in-completed-row': isRowComplete(row-1),
                   'in-completed-column': isColumnComplete(col-1),
                   'view-only-tile': adminOnlyCompletion && !isAdmin
                 }">
             
               <div class="tile-title" @click="handleTileClick(row-1, col-1)">
                 {{ getTile(row-1, col-1).title || "Empty" }}
               </div>
             
               <div class="tile-image-container"
                    :style="{ backgroundColor: getTile(row-1, col-1).backgroundColorRgb }"
                    @click="handleTileClick(row-1, col-1)">
                 <img v-if="getTile(row-1, col-1).imageUrl"
                      :src="getTile(row-1, col-1).imageUrl"
                      class="tile-image"
                      @error="handleImageError">
             
                 <!-- X mark for completed tiles -->
                 <div v-if="getTile(row-1, col-1).isCompleted"
                      :class="{
                        'completion-x': true,
                        'completion-x-gold': isRowComplete(row-1) || isColumnComplete(col-1)
                      }"></div>
               </div>
             
               <div class="tile-footer">
                 <div class="tile-points-display">{{ getTile(row-1, col-1).points || 0 }} pts</div>
                 <div class="tile-actions">
                   <!-- Toggle button with lock icon when locked -->
                   <button class="tile-action-btn toggle-btn"
                           :class="{ 'locked-toggle': adminOnlyCompletion && !isAdmin }"
                           @click="adminOnlyCompletion && !isAdmin ? showAdminLogin = true : toggleTileCompletion(row-1, col-1)">
                     <span v-if="adminOnlyCompletion && !isAdmin" class="lock-icon-small">🔒</span>
                     <span v-else>{{ getTile(row-1, col-1).isCompleted ? '✓' : '◯' }}</span>
                   </button>
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
      
      <!-- Admin Login Modal -->
      <div v-if="showAdminLogin" class="modal">
        <div class="modal-content admin-login-modal">
          <span class="modal-close" @click="showAdminLogin = false">&times;</span>
          <h2>Admin Authentication</h2>
          <p>Enter admin password to unlock tile completion:</p>
          <div class="admin-login-form">
            <input type="password" v-model="adminPassword" placeholder="Enter admin password" class="password-input">
            <div class="login-actions">
              <button class="btn cancel-btn" @click="showAdminLogin = false">Cancel</button>
              <button class="btn submit-btn" @click="submitAdminLogin">Submit</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Barrows Board Modal -->
      <div v-if="showBarrowsBoard" class="modal">
        <div class="modal-content barrows-modal">
          <span class="modal-close" @click="closeBarrowsBoard">&times;</span>
          <barrows-board 
            :completion-state="currentBarrowsTile?.completionState || initializeCompletionState()"
            :readonly="adminOnlyCompletion && !isAdmin"
            @completion-changed="handleBarrowsCompletion">
          </barrows-board>
        </div>
      </div>
    </div>
  `,

    components: {
        'barrows-board': BarrowsBoard
    },

    props: {
        boardCode: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            boardName: "Untitled Board",
            boardSize: 5,
            boardData: null,
            rowBonuses: [],
            columnBonuses: [],
            totalAvailablePoints: 0,
            adminOnlyCompletion: false,
            isAdmin: false,
            passwordHash: null,
            showAdminLogin: false,
            adminPassword: '',
            currentTileRow: -1,
            currentTileCol: -1,
            showBarrowsBoard: false,
            currentBarrowsTile: null
        };
    },

    created() {
        if (this.boardCode) {
            this.loadBoardFromCode(this.boardCode);
        } else {
            this.tryLoadFromLocalStorage();
        }
    },

    methods: {
        getTile(row, col) {
            if (!this.boardData || !this.boardData[row] || !this.boardData[row][col]) {
                return new BingoTile(row, col);
            }
            return this.boardData[row][col];
        },

        async loadBoardFromCode(code) {
            try {
                const response = await fetch(`/api/get-board/${code}`);

                if (response.ok) {
                    const boardData = await response.json();
                    this.loadBoardFromJson(JSON.stringify(boardData));
                } else {
                    const boardData = localStorage.getItem('bingoboard_' + code);
                    if (boardData) {
                        this.loadBoardFromJson(boardData);
                    } else {
                        throw new Error("Board not found");
                    }
                }
            } catch (error) {
                console.error("Error loading board:", error);

                const boardData = localStorage.getItem('bingoboard_' + code);
                if (boardData) {
                    this.loadBoardFromJson(boardData);
                } else {
                    alert("Invalid board code or board not found");
                }
            }
        },

        tryLoadFromLocalStorage() {
            const savedBoard = localStorage.getItem('osrsBingoBoard');
            if (savedBoard) {
                try {
                    this.loadBoardFromJson(savedBoard);
                } catch (error) {
                    console.error("Error loading board from localStorage:", error);
                }
            } else {
                this.createDefaultBoard();
            }
        },

        createDefaultBoard() {
            this.boardSize = 5;
            document.documentElement.style.setProperty('--board-size', this.boardSize);

            this.boardData = [];
            this.rowBonuses = Array(this.boardSize).fill(0);
            this.columnBonuses = Array(this.boardSize).fill(0);

            for (let row = 0; row < this.boardSize; row++) {
                this.boardData[row] = [];
                for (let col = 0; col < this.boardSize; col++) {
                    this.boardData[row][col] = new BingoTile(row, col);
                    this.boardData[row][col].title = "Default Tile";
                    this.boardData[row][col].points = 5;
                }
            }
        },

        loadBoardFromJson(jsonData) {
            const boardState = JSON.parse(jsonData);

            this.boardName = boardState.boardName || "Untitled Board";
            this.adminOnlyCompletion = boardState.adminOnlyCompletion || false;
            this.passwordHash = boardState.passwordHash;

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
                this.totalAvailablePoints = this.calculateTotalAvailablePoints();
            });
        },

        submitAdminLogin() {
            if (this.verifyAdminPassword(this.adminPassword)) {
                this.isAdmin = true;
                this.showAdminLogin = false;
                this.adminPassword = '';

                if (this.currentTileRow >= 0 && this.currentTileCol >= 0) {
                    const tile = this.getTile(this.currentTileRow, this.currentTileCol);
                    tile.isCompleted = !tile.isCompleted;
                    this.saveBoardToLocalStorage();

                    this.currentTileRow = -1;
                    this.currentTileCol = -1;
                }
            } else {
                alert('Incorrect password');
            }
        },

        verifyAdminPassword(password) {
            if (!password || !this.passwordHash) return false;

            const hash = this.hashPassword(password);
            return hash === this.passwordHash;
        },

        hashPassword(password) {
            let hash = 0;
            if (password.length === 0) return hash.toString();
            for (let i = 0; i < password.length; i++) {
                const char = password.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
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

        calculateTotalAvailablePoints() {
            let total = 0;

            if (!this.boardData) return total;

            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    total += this.getTile(row, col).points || 0;
                }
                total += this.rowBonuses[row] || 0;
            }

            for (let col = 0; col < this.boardSize; col++) {
                total += this.columnBonuses[col] || 0;
            }

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

        handleTileClick(row, col) {
            const tile = this.getTile(row, col);

            if (tile.title === 'Barrows Set') {
                this.openBarrowsBoard(row, col);
            } else if (this.adminOnlyCompletion && !this.isAdmin) {
                return;
            } else {
                this.toggleTileCompletion(row, col);
            }
        },

        openBarrowsBoard(row, col) {
            const tile = this.getTile(row, col);
            this.currentBarrowsTile = tile;
            this.currentTileRow = row;
            this.currentTileCol = col;
            this.showBarrowsBoard = true;
        },

        closeBarrowsBoard() {
            this.showBarrowsBoard = false;
            this.currentBarrowsTile = null;
        },

        initializeCompletionState() {
            const state = [];
            for (let i = 0; i < 4; i++) {
                state.push(Array(6).fill(false));
            }
            return state;
        },

        handleBarrowsCompletion(data) {
            if (!this.currentBarrowsTile) return;

            if (this.adminOnlyCompletion && !this.isAdmin) {
                return;
            }

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

            this.saveBoardToLocalStorage();
        },

        toggleTileCompletion(row, col) {
            if (this.adminOnlyCompletion && !this.isAdmin) {
                this.currentTileRow = row;
                this.currentTileCol = col;
                this.showAdminLogin = true;
                return;
            }

            const tile = this.getTile(row, col);
            tile.isCompleted = !tile.isCompleted;
            this.saveBoardToLocalStorage();
        },

        getTotalPoints() {
            let total = 0;

            if (!this.boardData) return total;

            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const tile = this.getTile(row, col);
                    if (tile.isCompleted) {
                        total += tile.points || 0;
                    }
                }

                if (this.isRowComplete(row)) {
                    total += this.rowBonuses[row] || 0;
                }
            }

            for (let col = 0; col < this.boardSize; col++) {
                if (this.isColumnComplete(col)) {
                    total += this.columnBonuses[col] || 0;
                }
            }

            return total;
        },

        handleImageError(event) {
            event.target.style.display = 'none';
            event.target.parentElement.classList.add('image-error');

            const errorSpan = document.createElement('span');
            errorSpan.className = 'image-error-text';
            errorSpan.textContent = 'Image could not be loaded';
            event.target.parentElement.appendChild(errorSpan);
        },

        saveBoardToLocalStorage() {
            const boardState = {
                tiles: this.boardData,
                rowBonuses: this.rowBonuses,
                columnBonuses: this.columnBonuses,
                rows: this.boardSize,
                columns: this.boardSize
            };

            try {
                localStorage.setItem('osrsBingoPlayer', JSON.stringify(boardState));
            } catch (error) {
                console.error("Error saving player progress:", error);
            }
        },

        canSaveBoard() {
            return !this.adminOnlyCompletion || this.isAdmin;
        },

        async saveProgress() {
            if (!this.canSaveBoard()) {
                alert("You need admin access to save changes to this board.");
                return;
            }

            try {
                console.log("Saving progress for board code:", this.boardCode);

                const response = await fetch(`/api/get-board/${this.boardCode}`);

                if (!response.ok) {
                    throw new Error(`Failed to get original board data: ${response.status}`);
                }

                const originalBoard = await response.json();
                console.log("Original board loaded:", originalBoard);

                const updatedBoard = { ...originalBoard };

                if (updatedBoard.tiles && this.boardData) {
                    for (let row = 0; row < this.boardSize; row++) {
                        for (let col = 0; col < this.boardSize; col++) {
                            if (updatedBoard.tiles[row] && updatedBoard.tiles[row][col] &&
                                this.boardData[row] && this.boardData[row][col]) {
                                updatedBoard.tiles[row][col].isCompleted = this.boardData[row][col].isCompleted;

                                if (this.boardData[row][col].completionState) {
                                    updatedBoard.tiles[row][col].completionState = this.boardData[row][col].completionState;
                                }
                            }
                        }
                    }
                }

                console.log("Sending updated board data");

                const saveResponse = await fetch('/api/save-board', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: this.boardCode,
                        boardData: updatedBoard
                    })
                });

                if (!saveResponse.ok) {
                    const errorData = await saveResponse.json();
                    throw new Error(`Failed to save board: ${saveResponse.status}, ${JSON.stringify(errorData)}`);
                }

                alert("Your progress has been saved!");

            } catch (error) {
                console.error("Error saving progress:", error);
                alert("There was an error saving your progress. Please try again.");
            }
        }
    }
};
