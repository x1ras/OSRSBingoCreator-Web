const BingoBoard = {
  template: `
    <div class="bingo-board-container">
      <div class="controls-panel">
        <div class="board-size-control">
          <label for="board-size">Board Size:</label>
          <input type="number" id="board-size" v-model.number="boardSize" min="3" max="10">
          <button class="btn" @click="createBoard">Create Board</button>
        </div>
        <div class="board-actions">
          <button class="btn" @click="clearBoard">Clear Board</button>
          <button class="btn" @click="saveBoard">Save Board</button>
          <button class="btn" @click="loadBoard">Load Board</button>
        </div>
      </div>
      
      <div v-if="boardData" class="bingo-board">
        <!-- Your board implementation will go here -->
        <div class="placeholder-message">
          <h3>Bingo Board Created!</h3>
          <p>Size: {{ boardSize }}x{{ boardSize }}</p>
          <p>Later we'll implement the full board UI here.</p>
          <button class="btn" @click="openBarrowsBoard">Open Barrows Board (Example)</button>
        </div>
      </div>
      
      <!-- Barrows Board Modal -->
      <div v-if="showBarrowsBoard" class="modal">
        <div class="modal-content">
          <span class="modal-close" @click="closeBarrowsBoard">&times;</span>
          <barrows-board 
            :completion-state="barrowsCompletionState"
            @completion-changed="handleBarrowsCompletion">
          </barrows-board>
        </div>
      </div>
    </div>
  `,
  
  components: {
    'barrows-board': BarrowsBoard
  },
  
  data() {
    return {
      boardSize: 5,
      boardData: null,
      rowBonuses: [],
      columnBonuses: [],
      showBarrowsBoard: false,
      barrowsCompletionState: [],
      currentBarrowsTile: null
    };
  },
  
  created() {
    this.initializeBarrowsState();
  },
  
  methods: {
    createBoard() {
      if (this.boardSize < 3 || this.boardSize > 10) {
        alert("Board size must be between 3 and 10");
        return;
      }
      
      this.boardData = [];
      this.rowBonuses = Array(this.boardSize).fill(0);
      this.columnBonuses = Array(this.boardSize).fill(0);
      
      for (let row = 0; row < this.boardSize; row++) {
        this.boardData[row] = [];
        for (let col = 0; col < this.boardSize; col++) {
          this.boardData[row][col] = new BingoTile(row, col);
        }
      }
      
      console.log(`Created new ${this.boardSize}x${this.boardSize} board`);
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
        
        console.log("Board cleared");
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
    
    loadBoard() {
      const savedBoard = localStorage.getItem('osrsBingoBoard');
      
      if (savedBoard) {
        try {
          this.loadBoardFromJson(savedBoard);
          return;
        } catch (error) {
          console.error("Error loading board from localStorage:", error);
        }
      }
      
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
    
    loadBoardFromJson(jsonData) {
      const boardState = JSON.parse(jsonData);
      
      this.boardSize = boardState.rows;
      this.rowBonuses = boardState.rowBonuses;
      this.columnBonuses = boardState.columnBonuses;
      
      this.boardData = [];
      for (let row = 0; row < boardState.rows; row++) {
        this.boardData[row] = [];
        for (let col = 0; col < boardState.columns; col++) {
          const jsonTile = boardState.tiles[row][col];
          const tile = new BingoTile(row, col);
          
          tile.title = jsonTile.title;
          tile.points = jsonTile.points;
          tile.imageUrl = jsonTile.imageUrl;
          tile.backgroundColorRgb = jsonTile.backgroundColorRgb;
          tile.isCompleted = jsonTile.isCompleted;
          
          if (jsonTile.completionState) {
            tile.completionState = jsonTile.completionState;
          }
          
          this.boardData[row][col] = tile;
        }
      }
      
      alert("Board loaded successfully!");
    },
    
    initializeBarrowsState() {
      this.barrowsCompletionState = [];
      for (let i = 0; i < 4; i++) {
        this.barrowsCompletionState.push(Array(6).fill(false));
      }
    },
    
    openBarrowsBoard() {
      this.showBarrowsBoard = true;
    },
    
    closeBarrowsBoard() {
      this.showBarrowsBoard = false;
    },
    
    handleBarrowsCompletion(data) {
      const { newState, isAnyColumnComplete, completedColumn } = data;
      
      this.barrowsCompletionState = newState;
      
      console.log("Barrows completion updated:");
      console.log(`- Any column complete: ${isAnyColumnComplete}`);
      console.log(`- Completed column: ${completedColumn}`);
      
    }
  }
};
