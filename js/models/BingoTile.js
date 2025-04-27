class BingoTile {

  constructor(row, column) {
    this.row = row;
    this.column = column;
    this.title = "";
    this.points = 0;
    this.imageUrl = null; 
    this.backgroundColorRgb = "transparent";
    this.isCompleted = false;
    this.completionState = this.initializeCompletionState();
  }

  initializeCompletionState() {
    const state = [];
    for (let i = 0; i < 4; i++) {
      state.push(Array(6).fill(false));
    }
    return state;
  }

  clone() {
    const clone = new BingoTile(this.row, this.column);
    clone.title = this.title;
    clone.points = this.points;
    clone.imageUrl = this.imageUrl;
    clone.backgroundColorRgb = this.backgroundColorRgb;
    clone.isCompleted = this.isCompleted;
    
    clone.completionState = this.completionState.map(row => [...row]);
    return clone;
  }
}
