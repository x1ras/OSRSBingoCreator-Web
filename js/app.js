const app = Vue.createApp({
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>OSRS Bingo Creator</h1>
        <p>Create, save, and share Old School RuneScape bingo boards</p>
      </header>
      
      <main>
        <bingo-board></bingo-board>
      </main>
      
      <footer class="app-footer">
        <p>Created by x1ras for OSRS players</p>
        <p><small>Not affiliated with Jagex or Old School RuneScape</small></p>
      </footer>
    </div>
  `,
  
  components: {
    'bingo-board': BingoBoard
  }
});

window.addEventListener('DOMContentLoaded', () => {
  app.mount('#app');
});
