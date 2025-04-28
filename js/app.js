/******************************************************************
    Landing Page 
******************************************************************/
const LandingPage = {
    template: `
    <div class="landing-page">
      <!-- Board code input at the top -->
      <div class="code-section">
        <h2>Enter a Board Code</h2>
        <p>Have a code for a bingo board? Enter it here to start playing or editing.</p>
        <div class="code-input-group">
          <input type="text" v-model="boardCode" placeholder="Enter board code" class="code-input">
          <button class="btn" @click="loadBoard">Load Board</button>
        </div>
      </div>
      
      <!-- Board Preview (show only when a board is loaded) -->
      <div v-if="loadedBoard" class="board-preview">
        <h2>{{ loadedBoard.boardName || 'Untitled Board' }}</h2>
        <div class="board-preview-details">
          <div class="preview-stat">Size: {{ loadedBoard.rows }}x{{ loadedBoard.columns }}</div>
          <div class="preview-stat">Available Points: {{ calculateTotalPoints() }}</div>
        </div>
        <div class="board-preview-actions">
          <button class="btn" @click="editInCreator">Edit in Creator</button>
          <button class="btn" @click="openInPlayer">Play Board</button>
        </div>
      </div>
      
      <div class="landing-options" v-if="!loadedBoard">
        <!-- Creator card (now on the left) -->
        <div class="option-card">
          <div>
            <h2>Creator Mode</h2>
            <p>Design your own OSRS bingo board with custom tiles, images, and point values.</p>
          </div>
          <div class="button-container">
            <button class="btn" @click="goToCreator">Create Board</button>
          </div>
        </div>
        
        <!-- Player card (now on the right) -->
        <div class="option-card">
          <div>
            <h2>Player Mode</h2>
            <p>Play an existing bingo board and track your progress.</p>
          </div>
          <div class="button-container">
            <button class="btn" @click="goToPlayer">Play Board</button>
          </div>
        </div>
      </div>
    </div>
  `,

    props: ['loadedBoard'],

    data() {
        return {
            boardCode: ''
        }
    },

    methods: {
        loadBoard() {
            if (!this.boardCode) {
                alert('Please enter a board code');
                return;
            }
            this.$emit('load-board', this.boardCode);
        },

        goToCreator() {
            this.$emit('show-creator', true);
        },

        goToPlayer() {
            this.$emit('show-player');
        },

        editInCreator() {
            this.$emit('edit-loaded-board');
        },

        openInPlayer() {
            this.$emit('play-loaded-board');
        },

        calculateTotalPoints() {
            if (!this.loadedBoard) return 0;

            let total = 0;

            for (let row = 0; row < this.loadedBoard.rows; row++) {
                for (let col = 0; col < this.loadedBoard.columns; col++) {
                    const tile = this.loadedBoard.tiles[row][col];
                    total += tile.points || 0;
                }
                total += this.loadedBoard.rowBonuses[row] || 0;
            }

            for (let col = 0; col < this.loadedBoard.columns; col++) {
                total += this.loadedBoard.columnBonuses[col] || 0;
            }

            return total;
        }
    }
};

/******************************************************************
    Vue App 
******************************************************************/
const app = Vue.createApp({
    template: `
    <div class="app-container">
      <header class="app-header">
        <h1>OSRS Bingo</h1>
        <p>Create, play, and share Old School RuneScape bingo boards</p>
        <div class="app-nav" v-if="currentView !== 'landing'">
          <button class="nav-btn" @click="currentView = 'landing'">Back to Home</button>
        </div>
      </header>
      
      <main>
        <landing-page v-if="currentView === 'landing'" 
                     :loaded-board="loadedBoardData"
                     @show-creator="showCreator" 
                     @show-player="showPlayer"
                     @load-board="loadBoardWithCode"
                     @edit-loaded-board="editLoadedBoard"
                     @play-loaded-board="playLoadedBoard"></landing-page>
        <bingo-board v-else-if="currentView === 'creator'" ref="bingoBoard"></bingo-board>
        <player-board v-else-if="currentView === 'player'" 
                     ref="playerBoard"
                     :board-code="currentBoardCode"></player-board>
      </main>
      
      <footer class="app-footer">
        <p>Created by x1ras for OSRS players</p>
        <p><small>Not affiliated with Jagex</small></p>
      </footer>
    </div>
  `,

    data() {
        return {
            currentView: 'landing',
            currentBoardCode: '',
            loadedBoardData: null
        }
    },

    methods: {
        showCreator(freshBoard = false) {
            this.currentView = 'creator';

            if (freshBoard) {
                this.$nextTick(() => {
                    localStorage.removeItem('osrsBingoBoard');

                    const bingoBoard = this.$refs.bingoBoard;
                    if (bingoBoard) {
                        bingoBoard.boardSize = 5;
                        bingoBoard.createBoard();
                    }
                });
            }
        },

        showPlayer() {
            this.currentView = 'player';
        },

        loadBoardWithCode(code) {
            try {
                const boardData = localStorage.getItem('bingoboard_' + code);

                if (boardData) {
                    this.loadedBoardData = JSON.parse(boardData);

                    this.currentBoardCode = code;
                } else {
                    alert("Board not found with that code");
                }
            } catch (error) {
                console.error("Error loading board:", error);
                alert("Invalid board code");
            }
        },

        editLoadedBoard() {
            if (this.loadedBoardData.passwordProtected) {
                const password = prompt("This board is password protected. Please enter the password:");
                
                if (!password) return;
                
                const hash = this.hashPassword(password);
                if (hash !== this.loadedBoardData.passwordHash) {
                    alert("Incorrect password");
                    return;
                }
            }
            
            this.currentView = 'creator';
            
            this.$nextTick(() => {
                const bingoBoard = this.$refs.bingoBoard;
                if (bingoBoard && this.loadedBoardData) {
                    bingoBoard.boardName = this.loadedBoardData.boardName || "Untitled Board";
                    bingoBoard.usePassword = this.loadedBoardData.passwordProtected || false;
                    bingoBoard.adminOnlyCompletion = this.loadedBoardData.adminOnlyCompletion || false;
                    
                    
                    bingoBoard.boardSize = this.loadedBoardData.rows;
                    bingoBoard.rowBonuses = this.loadedBoardData.rowBonuses;
                    bingoBoard.columnBonuses = this.loadedBoardData.columnBonuses;
                    
                    bingoBoard.boardData = this.loadedBoardData.tiles;
                    document.documentElement.style.setProperty('--board-size', this.loadedBoardData.rows);
                }
            });
        },

        playLoadedBoard() {
            if (this.currentBoardCode) {
                this.currentView = 'player';
            }
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
        }
    },

    components: {
        'landing-page': LandingPage,
        'bingo-board': BingoBoard,
        'player-board': PlayerBoard
    }
});

window.addEventListener('DOMContentLoaded', () => {
    app.mount('#app');
});
