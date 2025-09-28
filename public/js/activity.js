// public/js/activity.js
document.addEventListener('DOMContentLoaded', () => {
  const quizEl = document.getElementById('quiz');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const restartBtn = document.getElementById('restart');

  const questions = [
    { q: 'Community Football Match',  answers: ['26 Sep 2025','12 Oct 2025','05 Nov 2025'], correct: 0 },
    { q: 'Autumn Jazz Night',        answers: ['05 Nov 2025','12 Oct 2025','20 Aug 2024'], correct: 1 },
    { q: 'Wellbeing Fair',           answers: ['02 Oct 2025','15 May 2024','26 Sep 2025'], correct: 0 },
    { q: 'Intro to Coding Workshop', answers: ['05 Nov 2025','02 Oct 2025','12 Oct 2025'], correct: 0 },
    { q: 'Summer Tennis Meetup',     answers: ['20 Aug 2024','26 Sep 2025','05 Nov 2025'], correct: 0 },
    { q: 'Christmas Market',         answers: ['15 Dec 2025','31 Dec 2025','20 Aug 2024'], correct: 0 },
    { q: 'Christmas Lights Switch-On', answers: ['05 Dec 2025','31 Dec 2025','15 Dec 2025'], correct: 0 },
    { q: 'New Year’s Eve Party',     answers: ['31 Dec 2025','15 Dec 2025','05 Nov 2025'], correct: 0 },
  ];

  let i = 0, score = 0;

  const BEST_KEY = 'activity_best_score';
  const bestStored = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = String(bestStored);

  function render() {
    if (i >= questions.length) {
      quizEl.innerHTML = `
        <p class="final-msg">🎉 Finished! Final score: <strong>${score}/${questions.length}</strong></p>
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
      <div class="grid" role="group" aria-label="Answer choices">
        ${answers.map((a, idx) => `
          <button class="card answer" data-idx="${idx}" type="button" aria-label="Answer ${idx+1}: ${a}">
            ${a}
          </button>
        `).join('')}
      </div>
    `;

    // attach handlers
    quizEl.querySelectorAll('.answer').forEach(btn => {
      btn.addEventListener('click', () => checkAnswer(btn));
    });

    // focus first answer for keyboard users
    quizEl.querySelector('.answer')?.focus();
  }

  function checkAnswer(btn) {
    const chosen = Number(btn.dataset.idx);
    const correctIdx = questions[i].correct;
    const buttons = quizEl.querySelectorAll('.answer');

    // prevent double clicks
    buttons.forEach(b => (b.disabled = true));

    if (chosen === correctIdx) {
      score++;
      btn.classList.add('correct');
      flash('#ecfdf5'); // green flash
    } else {
      btn.classList.add('wrong');
      buttons[correctIdx]?.classList.add('correct');
      flash('#fef2f2'); // red flash
    }

    scoreEl.textContent = String(score);

    setTimeout(() => { i++; render(); }, 900);
  }

  // one global key handler for 1/2/3 shortcuts
  document.addEventListener('keydown', (e) => {
    if (!['1','2','3'].includes(e.key)) return;
    const idx = Number(e.key) - 1;
    const btn = quizEl.querySelector(`.answer[data-idx="${idx}"]`);
    if (btn && !btn.disabled) btn.click();
  });

  function flash(color) {
    quizEl.style.transition = 'background .25s';
    quizEl.style.background = color;
    setTimeout(() => { quizEl.style.background = ''; }, 250);
  }

  function reset() {
    i = 0; score = 0;
    scoreEl.textContent = '0';
    render();
  }

  restartBtn.addEventListener('click', reset);
  render();
});
