// sample-01
// we'll use a regular expression to match and count our "words"
function countWords(paragraphElement: HTMLElement) {
	return (paragraphElement.textContent.match(/\S+/g) ?? []).length;
}
// get references to our paragraph elements
const paragraphElements = Array.from(
	document.getElementsByTagName('p')
);
console.log(
	countWords(paragraphElements[0])
); // 24 words in the first paragraph
console.log(
	paragraphElements.reduce(
		(articleWordCount, paragraphElement) => (
			articleWordCount + countWords(paragraphElement)
		),
		0
	)
); // 122 words in the whole article

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
	borderBox: DOMRect,
	readingProgress: number[]
}
// paragraphs have references to the concrete element and the abstract lines
interface Paragraph {
	element: HTMLElement,
	lines: Line[]
}
// create line references for a given paragraph element
function createLines(paragraphElement: HTMLElement) {
	// take some measurements
	const
		clientRects = Array.from(
			paragraphElement.firstElementChild.getClientRects()
		),
		lineCount = clientRects.length,
		wordCount = countWords(paragraphElement),
		minLineWordCount = Math.floor(wordCount / lineCount);
	// distribute the words evenly over the lines
	let remainingWordCount = wordCount % lineCount;
	return clientRects.map(
		clientRect => {
			let lineWordCount = minLineWordCount;
			if (remainingWordCount) {
				lineWordCount++;
				remainingWordCount--;
			}
			return {
				borderBox: clientRect,
				readingProgress: [-lineWordCount]
			};
		}
	);
}
// map our paragraph elements to paragraphs
const paragraphs = paragraphElements.map(
	paragraphElement => ({
		element: paragraphElement,
		lines: createLines(paragraphElement)
	})
);

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
		line => (
			line.borderBox.top > 0 &&
			line.borderBox.bottom < window.innerHeight
		)
	);
	// increment the progress array left to right if found
	if (readableLine) {
		const progress = readableLine.readingProgress;
		if (progress.length === 1) {
			progress.unshift(1);
		} else {
			progress[0]++;
		}
		if (progress[1] === -1) {
			progress.splice(1, 1);
		} else {
			progress[1]++;
		}
	}
	return true;
}
// create an array of lines from the paragraphs
const lines = paragraphs.reduce(
	(lines, paragraph) => lines.concat(paragraph.lines),
	[]
);
// set an interval to read a word every 200 ms (equal to 300 word per minute)
const readingInterval = setInterval(
	() => {
		// attempt to read a word and stop the loop if we're done
		if (
			!tryReadWord(lines)
		) {
			clearInterval(readingInterval);
		}
	},
	200
);