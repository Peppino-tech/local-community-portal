document.addEventListener('DOMContentLoaded', () => {
  const quizEl = document.getElementById('quiz');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const restartBtn = document.getElementById('restart');

  const questions = [
    { q: 'Community Football Match', answers: ['26 Sep 2025','12 Oct 2025','05 Nov 2025'], correct: 0 },
    { q: 'Autumn Jazz Night',       answers: ['05 Nov 2025','12 Oct 2025','20 Aug 2024'], correct: 1 },
    { q: 'Wellbeing Fair',          answers: ['02 Oct 2025','15 May 2024','26 Sep 2025'], correct: 0 },
    { q: 'Intro to Coding Workshop',answers: ['05 Nov 2025','02 Oct 2025','12 Oct 2025'], correct: 0 },
    { q: 'Summer Tennis Meetup',    answers: ['20 Aug 2024','26 Sep 2025','05 Nov 2025'], correct: 0 },
  ];

  let i = 0, score = 0;

  const BEST_KEY = 'activity_best_score';
  const bestStored = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = String(bestStored);

  function render() {
    if (i >= questions.length) {
      quizEl.innerHTML = `
        <p>Finished! Final score: <strong>${score}/${questions.length}</strong></p>
        <p><button id="again" class="btn-outline" type="button">Play again</button></p>
      `;
      document.getElementById('again').addEventListener('click', reset);
      if (score > bestStored) {
        localStorage.setItem(BEST_KEY, String(score));
        bestEl.textContent = String(score);
      }
      return;
    }
    const { q, answers } = questions[i];
    quizEl.innerHTML = `
      <h2>When is: ${q}?</h2>
      <div class="grid">
        ${answers.map((a, idx) => `
          <button class="card answer" data-idx="${idx}" type="button" aria-label="Answer ${idx+1}: ${a}">
            ${a}
          </button>
        `).join('')}
      </div>
    `;
    quizEl.querySelectorAll('.answer').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = Number(btn.dataset.idx);
        if (chosen === questions[i].correct) score++;
        scoreEl.textContent = String(score);
        i++;
        render();
      });
    });
  }

  function reset() {
    i = 0; score = 0;
    scoreEl.textContent = '0';
    render();
  }

  restartBtn.addEventListener('click', reset);
  render();
});
