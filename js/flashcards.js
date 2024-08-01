let vocabulary = [];
let currentIndex = 0;
let isJapaneseToEnglish = true;
let knownStack = [];
let unknownStack = [];

const flashcard = document.getElementById('flashcard');
const japaneseElement = document.getElementById('japanese');
const englishElement = document.getElementById('english');
const toggleDirectionButton = document.getElementById('toggleDirection');
const resetButton = document.getElementById('reset');
const knownButton = document.getElementById('known');
const unknownButton = document.getElementById('unknown');
const nextButton = document.getElementById('next');
const knownCountElement = document.getElementById('knownCount');
const unknownCountElement = document.getElementById('unknownCount');

// Load vocabulary from JSON file
fetch('v.json')
  .then(response => response.json())
  .then(data => {
    vocabulary = data;
    updateCard();
  })
  .catch(error => console.error('Error loading vocabulary:', error));

function updateCard() {
    if (vocabulary.length === 0) {
        japaneseElement.textContent = "All cards learned!";
        englishElement.textContent = "Great job!";
        disableButtons(true);
        return;
    }

    const currentWord = vocabulary[currentIndex];
    if (isJapaneseToEnglish) {
        japaneseElement.textContent = `${currentWord.kanji}\n(${currentWord.hiragana})`;
        englishElement.textContent = currentWord.english;
    } else {
        japaneseElement.textContent = currentWord.english;
        englishElement.textContent = `${currentWord.kanji}\n(${currentWord.hiragana})`;
    }
    flashcard.classList.remove('flipped');
}

function nextCard() {
    if (vocabulary.length > 0) {
        currentIndex = (currentIndex + 1) % vocabulary.length;
        updateCard();
    }
}

function updateStats() {
    knownCountElement.textContent = knownStack.length;
    unknownCountElement.textContent = unknownStack.length;
}

function disableButtons(disabled) {
    knownButton.disabled = disabled;
    unknownButton.disabled = disabled;
    nextButton.disabled = disabled;
}

flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
});

toggleDirectionButton.addEventListener('click', () => {
    isJapaneseToEnglish = !isJapaneseToEnglish;
    updateCard();
});

resetButton.addEventListener('click', () => {
    // Reload vocabulary from JSON file
    fetch('vocabulary.json')
      .then(response => response.json())
      .then(data => {
        vocabulary = data;
        currentIndex = 0;
        knownStack = [];
        unknownStack = [];
        updateCard();
        updateStats();
        disableButtons(false);
      })
      .catch(error => console.error('Error reloading vocabulary:', error));
});

knownButton.addEventListener('click', () => {
    knownStack.push(vocabulary[currentIndex]);
    vocabulary.splice(currentIndex, 1);
    if (currentIndex >= vocabulary.length) {
        currentIndex = 0;
    }
    updateCard();
    updateStats();
});

unknownButton.addEventListener('click', () => {
    unknownStack.push(vocabulary[currentIndex]);
    nextCard();
    updateStats();
});

nextButton.addEventListener('click', nextCard);