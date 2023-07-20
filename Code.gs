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

let wordsPerSessionSheet = spreadsheet.getSheetByName('Words per session');
if (wordsPerSessionSheet == null) {
  console.log('Creating sheet: Words per session');
  wordsPerSessionSheet = spreadsheet.insertSheet('Words per session');
  wordsPerSessionSheet.getRange(1, 1).setValue(20);
}
const wordsPerSession = wordsPerSessionSheet.getRange(1, 1).getValue();

let intervalsSheet = spreadsheet.getSheetByName('Intervals');
if (intervalsSheet == null) {
  console.log('Creating sheet: Intervals');
  intervalsSheet = spreadsheet.insertSheet('Intervals');
  intervalsSheet.getRange(1, 1, 7, 1).setValues([[1], [3], [7], [30], [60], [180], [360]]);
}

const intervalColumnIndex = 1;
const repetitionDateColumnIndex = 2;
const questionColumnIndex = 3;
const answerColumnIndex = 4;

const intervals = intervalsSheet.getDataRange().getValues().map(function (interval) {return interval[0];}).sort(function (a, b) {return a - b;});
const today = new Date();
const tomorrow = getDatePlusInterval(intervals[0]);

function addCard(question, answer) {
  console.log(`Adding new card:\nQ: ${question}\nA: ${answer}`)
  let yOffset = cardsSheet.getDataRange().getValues().length + 1;
  if (isNaN(yOffset)) yOffset = 1;
  cardsSheet.getRange(yOffset, intervalColumnIndex).setValue(1);
  cardsSheet.getRange(yOffset, repetitionDateColumnIndex).setValue(tomorrow);
  cardsSheet.getRange(yOffset, questionColumnIndex).setValue(question);
  cardsSheet.getRange(yOffset, answerColumnIndex).setValue(answer);
}

// TODO new version should also overwrite question/answer in FE when sending request
function editCard(id, question, answer) {
  console.log(`Updating card: ${id}:\nQ: ${question}\nA: ${answer}`)
  cardsSheet.getRange(id, questionColumnIndex).setValue(question);
  cardsSheet.getRange(id, answerColumnIndex).setValue(answer);
}

// TODO a card should also be removed in FE when sending request
function removeCard(id) {
  console.log(`Updating card: ${id}`)
  cardsSheet.getRange(id, 1, 1, answerColumnIndex).clearContent();
}

function getCards() {
  cardsSheet.getDataRange().sort({ column: intervalColumnIndex, ascending: false });
  let cardsArray = [];
  let i = 0;
  let cards = cardsSheet.getDataRange().getValues();
  if (cards[0][0] !== '') {
    while (cardsArray.length < wordsPerSession && i < cards.length) {
      let card = cards[i];
      i++;
      if (new Date(card[repetitionDateColumnIndex - 1]) <= today) {
        cardsArray.push([
          i,
          card[questionColumnIndex - 1], // TODO deal with multiline question/answer in FE
          card[answerColumnIndex - 1],
        ]);
      }
    }
    i = 0;
    while (cardsArray.length < wordsPerSession && i < cards.length) {
      let card = cards[i];
      i++;
      let isCardAlreadyThere = false;
      for (let alreadyAddedCard of cardsArray) {
        if (alreadyAddedCard[0] === i) {
          isCardAlreadyThere = true;
          break;
        }
      }
      if (!isCardAlreadyThere && card[intervalColumnIndex - 1] <= intervals[intervals.length - 2]) {
        cardsArray.push([
          i,
          card[questionColumnIndex - 1],
          card[answerColumnIndex - 1],
        ]);
      }
    }
  }
  console.log('Selected cards:');
  console.log(cardsArray);
  return cardsArray;   // TODO Deal with empty arr in FE
}

function finaliseSession(cardsMap) {
  console.log('Finalise session:');
  for (let [id, isLearned] of cardsMap) {
    console.log('');
    console.log(`Id: ${id}`);
    let intervalCell = cardsSheet.getRange(id, intervalColumnIndex);
    let currentInterval = intervalCell.getValue();
    if (isLearned) {
      let exceedsLastInterval = true;
      for (let newInterval of intervals) {
        if (newInterval > currentInterval) {
          console.log('The card was successfully learned');
          console.log(`Setting new repetition interval '${newInterval}' instead of '${currentInterval}'`);
          intervalCell.setValue(newInterval);
          let newDate = getDatePlusInterval(newInterval);
          console.log(`Setting new repetition date: ${newDate}`);
          cardsSheet.getRange(id, repetitionDateColumnIndex).setValue(newDate);
          exceedsLastInterval = false;
          break;
        }
      }
      if (exceedsLastInterval) {
        console.log('The card has reached latest repetition interval');
        let newInterval = intervals[intervals.length - 1];
        console.log(`Resetting repetition interval: ${newInterval}`);
        intervalCell.setValue(newInterval);
        let newDate = getDatePlusInterval(newInterval);
        console.log(`Setting new repetition date: ${newDate}`);
        cardsSheet.getRange(id, repetitionDateColumnIndex).setValue(newDate);
      }
    } else {
      console.log('The card was not learned');
      intervalCell.setValue(intervals[0]);
      cardsSheet.getRange(id, repetitionDateColumnIndex).setValue(tomorrow);
    }
  }
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index');
}

function getDatePlusInterval(interval) {
  const date = new Date(new Date().setDate(today.getDate() + interval));
  return `${date.getFullYear().toString()}-${date.getMonth() + 1}-${date.getDate()}`;
}