function test() {
  // addCard('question', 'answer');

  // getCards();

  // editCard(3, 'new_question', 'new_answer');

  // removeCard(4);

  // finaliseSession(new Map([
  //   [1, false],
  //   [2, true],
  //   [3, true],
  // ]));
}

console.log('Initiating sheets');
const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

let cardsSheet = spreadsheet.getSheetByName('Cards');
if (cardsSheet == null) {
  console.log('Creating sheet: Cards');
  cardsSheet = spreadsheet.insertSheet('Cards');
}

let intervalsSheet = spreadsheet.getSheetByName('Intervals');
if (intervalsSheet == null) {
  console.log('Creating sheet: Intervals');
  intervalsSheet = spreadsheet.insertSheet('Intervals');
  intervalsSheet.getRange(1, 1, 7, 1).setValues([[1], [3], [7], [30], [60], [180], [360]]);
}

const questionColumnIndex = 1;
const answerColumnIndex = 2;
const repetitionDateColumnIndex = 3;
const intervalColumnIndex = 4;
const isCardFlippedColumnIndex = 5;

const intervals = intervalsSheet.getDataRange().getValues().map(function (interval) {return interval[0];}).sort(function (a, b) {return a - b;});
const today = new Date();
const tomorrow = getDatePlusInterval(intervals[0]);

function addCard(question, answer) {
  console.log(`Adding new card:\nQ: ${question}\nA: ${answer}`);
  let yOffset = cardsSheet.getDataRange().getValues().length + 1;
  if (isNaN(yOffset)) yOffset = 1;
  cardsSheet.getRange(yOffset, intervalColumnIndex).setValue(1);
  cardsSheet.getRange(yOffset, repetitionDateColumnIndex).setValue(tomorrow);
  cardsSheet.getRange(yOffset, questionColumnIndex).setValue(question);
  cardsSheet.getRange(yOffset, answerColumnIndex).setValue(answer);
}

function editCard(id, question, answer) {
  console.log(`Updating card: ${id}:\nQ: ${question}\nA: ${answer}`);
  cardsSheet.getRange(id, questionColumnIndex).setValue(question);
  cardsSheet.getRange(id, answerColumnIndex).setValue(answer);
}

// TODO a card should also be removed in FE when sending request
function removeCard(id) {
  console.log(`Removing card: ${id}`);
  cardsSheet.getRange(id, 1, 1, answerColumnIndex).clearContent();
}

function getCards() {
  cardsSheet.getDataRange().sort({ column: intervalColumnIndex, ascending: false });
  let i = 0;
  let cards = cardsSheet.getDataRange().getValues();
  for (let card of cards) {
    i++;
    if (new Date(card[repetitionDateColumnIndex - 1]) <= today || card[repetitionDateColumnIndex - 1] === '') {
      return [
        i,
        card[questionColumnIndex - 1],
        card[answerColumnIndex - 1],
      ];
    }
  }
  return 'Nothing to learn';
}

function finaliseSession(id, isLearned) {
  console.log('Finalise session:');
  console.log('');
  console.log(`Id: ${id}`);
  let intervalCell = cardsSheet.getRange(id, intervalColumnIndex);
  let currentInterval = intervalCell.getValue();
  if (isLearned && currentInterval !== '') {
    let isCardFlippedCell = cardsSheet.getRange(id, isCardFlippedColumnIndex);
    let isCardFlipped = isCardFlippedCell.getValue();
    let newInterval;

    if (isCardFlipped === 'flipped') {
      let exceedsLastInterval = true;
      for (let interval of intervals) {
        if (interval > currentInterval) {
          console.log('The card was successfully learned');
          console.log(`Setting new repetition interval '${interval}' instead of '${currentInterval}'`);
          newInterval = interval;
          exceedsLastInterval = false;
          break;
        }
      }
      if (exceedsLastInterval) {
        console.log('The card has reached latest repetition interval');
        newInterval = intervals[intervals.length - 1];
        console.log(`Resetting repetition interval: ${newInterval}`);
      }
      isCardFlippedCell.setValue('');
    } else {
      newInterval = currentInterval;
      isCardFlippedCell.setValue('flipped');
    }
    intervalCell.setValue(newInterval);
    let newDate = getDatePlusInterval(newInterval);
    console.log(`Setting new repetition date: ${newDate}`);
    cardsSheet.getRange(id, repetitionDateColumnIndex).setValue(newDate);
    console.log(`Flipping q/a for card: ${id}`);
    let questionCell = cardsSheet.getRange(id, questionColumnIndex);
    let answerCell = cardsSheet.getRange(id, answerColumnIndex);
    let question = questionCell.getValue();
    let answer = answerCell.getValue();
    answerCell.setValue(question);
    questionCell.setValue(answer);
  } else {
    console.log('The card was not learned');
    intervalCell.setValue(intervals[0]);
    cardsSheet.getRange(id, repetitionDateColumnIndex).setValue(tomorrow);
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function getDatePlusInterval(interval) {
  const date = new Date(new Date().setDate(today.getDate() + interval));
  return `${date.getFullYear().toString()}-${date.getMonth() + 1}-${date.getDate()}`;
}
