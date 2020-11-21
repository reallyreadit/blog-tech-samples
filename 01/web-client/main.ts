// sample-01
// we'll use a regular expression to match and count our "words"
function countWords(paragraphElement: HTMLElement) {
	return (paragraphElement.textContent.match(/\S+/g) ?? []).length;
}
// get references to our paragraph elements
const paragraphElements = Array.from(document.getElementsByTagName('p'));
console.log('Words in the first paragraph:', countWords(paragraphElements[0])); // 115
console.log(
	'Words in the whole article:',
	paragraphElements.reduce(
		(articleWordCount, paragraphElement) =>
			articleWordCount + countWords(paragraphElement),
		0
	)
); // 929

// sample-02
// nest text within a span element so we can use Element.getClientRects
function nestTextWithinSpanElement(paragraphElement: HTMLElement) {
	// store the text
	const text = paragraphElement.textContent;
	// remove the existing child nodes
	while (paragraphElement.hasChildNodes()) {
		paragraphElement.firstChild.remove();
	}
	// create a new span element and assign the text to it
	const spanElement = document.createElement('span');
	spanElement.textContent = text;
	// append the span element to the paragraph element
	paragraphElement.append(spanElement);
}
// replace text nodes with span elements in each paragraph
paragraphElements.forEach(nestTextWithinSpanElement);

// sample-03
// we'll keep track of the position and progress of each line of text
interface Line {
	borderBox: DOMRect;
	readingProgress: number[];
	// not in article: visual marker element for this line
	markerElement: HTMLDivElement;
}
// paragraphs have references to the concrete element and the abstract lines
interface Paragraph {
	element: HTMLElement;
	lines: Line[];
}

// the original scroll position of the viewport; to be used to check
// when line marker boxes are in view or not
let originalViewportTop = 0;

// create line references for a given paragraph element
function createLines(paragraphElement: HTMLElement) {
	// take some measurements
	originalViewportTop = window.visualViewport.pageTop;
	const clientRects = Array.from(
			paragraphElement.firstElementChild.getClientRects()
		),
		lineCount = clientRects.length,
		wordCount = countWords(paragraphElement),
		minLineWordCount = Math.floor(wordCount / lineCount);
	// distribute the words evenly over the lines
	let remainingWordCount = wordCount % lineCount;
	return clientRects.map(clientRect => {
		let lineWordCount = minLineWordCount;
		if (remainingWordCount) {
			lineWordCount++;
			remainingWordCount--;
		}

		return {
			borderBox: clientRect,
			readingProgress: [-lineWordCount],
			// not in the article: adds a visual representation of this line to the DOM and stores it here
			markerElement: createLineMarker(paragraphElement, clientRect),
		};
	});
}
// map our paragraph elements to paragraphs
const paragraphs = paragraphElements.map(paragraphElement => ({
	element: paragraphElement,
	lines: createLines(paragraphElement),
}));

// sample-04
/*
Read the next visible word. Return true if a word is read or if there are any
words remaining to be read, otherwise return false.
*/
function tryReadWord(lines: Line[]) {
	/*
	Search for any unfinished lines. We're reading from left to right so we only
	have to check the sign of the last element in the array.
	*/
	const unfinishedLines = lines.filter(
		line => line.readingProgress[line.readingProgress.length - 1] < 0
	);
	// return false if there is nothing left to read
	if (!unfinishedLines.length) {
		return false;
	}
	// find the first line that is visible within the viewport
	const readableLine = unfinishedLines.find(
		line =>
			line.borderBox.top + originalViewportTop >
				window.visualViewport.pageTop &&
			line.borderBox.bottom + originalViewportTop <
				window.visualViewport.pageTop + window.innerHeight
	);
	// increment the progress array left to right if found
	if (readableLine) {
		const progress = readableLine.readingProgress;
		/*
		We'll start by marking the next word as having been read. First we'll
		check the array's length. The progress array of a completely unread line
		will contain only a single negatively-signed integer.
		*/
		if (progress.length === 1) {
			/*
			If that's the case we'll insert a 1 at the beginning of the array to
			represent the word that we've just read since we're reading from left
			to right.
			*/
			progress.unshift(1);
		} else {
			/*
			If there is already more than one element in the array then we know
			this line is partially read. Since we're reading from left to right we
			know the first element is a positive integer so we just increment it
			by one to represent the word that we've just read.
			*/
			progress[0]++;
		}
		/*
		Next we'll check to see if we've finished reading this line by checking
		the value of the negatively-signed integer in the second position of the
		array.
		*/
		if (progress[1] === -1) {
			/*
			If it equals -1 then there was only one word left to read and we can
			just remove it from the array.
			*/
			progress.splice(1, 1);
		} else {
			/*
			Otherwise we'll increment the value which will decrease the count of
			unread words by one since this is a negative number.
			*/
			progress[1]++;
		}
	}
	updateLineMarkers(unfinishedLines);
	return true;
}

// create an array of lines from the paragraphs
const lines = paragraphs.reduce(
	(lines, paragraph) => lines.concat(paragraph.lines),
	[]
);
// set an interval to read a word every 200 ms (equal to 300 word per minute)
const readingInterval = setInterval(() => {
	// attempt to read a word and stop the loop if we're done
	if (!tryReadWord(lines)) {
		clearInterval(readingInterval);
	}
}, 200);

// ---- extra code to visualize the reading tracker progress, not included in the article samples ----
// Creates a <div> element for the given DOMRect and and adds it to the given paragraph.
function createLineMarker(paragraphElement: HTMLElement, lineRect: DOMRect) {
	// side effect: make the paragraph the reference for absolute elements
	paragraphElement.style.position = 'relative';
	const paragraphRect = paragraphElement.getClientRects()[0];
	const lineMarker = document.createElement('div');
	lineMarker.setAttribute(
		'style',
		`
		  top: ${lineRect.top - paragraphRect.top}px;
		  height: ${lineRect.height}px;
		  left: 0;
		  position: absolute;
		  box-shadow: lime 0px 0px 0px 2px inset;
		  background-image: linear-gradient(to right, rgba(0, 255, 0, 0.5) 100%, transparent 100%);
		`
	);
	// side effect: add visual line box to the paragraph
	paragraphElement.appendChild(lineMarker);
	return lineMarker;
}

// updates the visual state of the line marker elements in the given lines
function updateLineMarkers(lines: Line[]) {
	lines.forEach(line => {
		// calculates the fraction of the line that was read
		const lineProgress = line => {
			const totalWords = line.readingProgress.reduce(
				(progress, word) => progress + Math.abs(word),
				0
			);
			const readWords = line.readingProgress.reduce(
				(progress, word) => progress + word,
				0
			);
			return readWords > 0 ? readWords / totalWords : 0;
		};
		line.markerElement.style.width =
			line.markerElement.parentElement.clientWidth * lineProgress(line) + 'px';
	});
}
