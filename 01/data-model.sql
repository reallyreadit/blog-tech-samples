-- create our database and populate with stub tables
CREATE DATABASE
	readup_blog_01;

CREATE TABLE
	article (
		id bigint PRIMARY KEY
	);

CREATE TABLE
	reader (
		id bigint PRIMARY KEY
	);

-- first try
CREATE TABLE
	reader_article (
		reader_id  int REFERENCES reader (id),
		article_id int REFERENCES article (id),
		is_read    bool NOT NULL,
		PRIMARY KEY (
			reader_id,
			article_id
		)
	);

-- rewind
DROP TABLE
	reader_article;

-- second try
CREATE DOMAIN
	reading_progress
AS
	numeric
CHECK (
	VALUE <@ '[0, 1]'::numrange
);

CREATE TABLE
	reader_article (
		reader_id  int REFERENCES reader (id),
		article_id int REFERENCES article (id),
		progress   reading_progress NOT NULL,
		date_read  timestamp,
		PRIMARY KEY (
			reader_id,
			article_id
		)
	);

-- rewind
DROP TABLE
	reader_article;

DROP TYPE
	reading_progress;

-- third try
CREATE DOMAIN
	word_number
AS
	int
CHECK (
	VALUE >= 0
);

CREATE TABLE
	word (
		article_id int REFERENCES article (id),
		number     word_number,
		PRIMARY KEY (
			article_id,
			number
		)
	);

CREATE TABLE
	reader_word (
		reader_id  int REFERENCES reader (id),
		article_id int,
		number     word_number,
		date_read  timestamp NOT NULL,
		PRIMARY KEY (
			reader_id,
			article_id,
			number
		),
		FOREIGN KEY (
			article_id,
			number
		)
		REFERENCES
			word (
				article_id,
				number
			)
	);

-- seed with data
INSERT INTO
	article (
		id
	)
VALUES
	(1),
	(8);

INSERT INTO
	word (
		article_id,
		number
	)
VALUES
	(1, 0),
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(8, 0),
	(8, 1),
	(8, 2),
	(8, 3),
	(8, 4),
	(8, 5),
	(8, 6),
	(8, 7),
	(8, 8),
	(8, 9),
	(8, 10),
	(8, 11),
	(8, 12),
	(8, 13),
	(8, 14),
	(8, 15),
	(8, 16),
	(8, 17),
	(8, 18),
	(8, 19);

INSERT INTO
	reader (
		id
	)
VALUES
	(2),
	(7);

INSERT INTO
	reader_word (
		reader_id,
		article_id,
		number,
		date_read
	)
VALUES
	(2, 1, 0, '2020-01-01T12:00:00.000'),
	(2, 1, 1, '2020-01-01T12:00:00.200'),
	(2, 1, 2, '2020-01-01T12:00:00.400'),
	(2, 1, 3, '2020-01-01T12:00:00.600'),
	(2, 1, 4, '2020-01-01T12:00:00.800'),
	(7, 1, 0, '2020-01-01T12:01:00.000'),
	(7, 1, 1, '2020-01-01T12:01:00.200'),
	(7, 8, 0, '2020-01-01T12:00:00.000'),
	(7, 8, 1, '2020-01-01T12:00:00.326'),
	(7, 8, 2, '2020-01-01T12:00:00.652'),
	(7, 8, 3, '2020-01-01T12:00:01.304'),
	(7, 8, 4, '2020-01-01T12:00:01.630'),
	(7, 8, 5, '2020-01-01T12:00:01.956'),
	(7, 8, 6, '2020-01-01T12:00:02.282'),
	(7, 8, 10, '2020-01-01T12:00:04.000'),
	(7, 8, 11, '2020-01-01T12:00:04.326'),
	(7, 8, 14, '2020-01-01T12:00:05.000'),
	(7, 8, 18, '2020-01-01T12:00:06.000');

-- Retrieve the reading progress for reader 7 on article 8.
SELECT
	word.number,
	reader_word.date_read
FROM
	word
	LEFT JOIN reader_word ON
		reader_word.reader_id = 7 AND
		reader_word.article_id = word.article_id AND
		reader_word.number = word.number
WHERE
	word.article_id = 8
ORDER BY
	word.number;

-- rewind
DROP TABLE
	reader_word;

DROP TABLE
	word;

DROP TYPE
	word_number;

-- final version
/*
This might look a little crazy compared to the previous examples but we've got
some more extensive checking to do to ensure our array contains valid elements.
This function checks each array element to ensure that no values are null or
equal to zero and that the current element's sign is the inverse of that of the
previous element if present.

The call to coalesce ensures that the array contains at least one value.

The CHECK portion of the DOMAIN definition can only contain an expression which
is why we need to create a separate function instead of just inlining a
subquery.
*/
CREATE FUNCTION
	is_reading_progress_valid(
		reading_progress int[]
	)
RETURNS
	bool
LANGUAGE
	sql
IMMUTABLE
AS $$
	SELECT
		coalesce(
			every(validation_check.element_is_valid),
			FALSE
		)
	FROM
		(
			SELECT
				(
					progress_element.value IS NOT NULL AND
					progress_element.value != 0 AND
					CASE
						sign(
							lag(progress_element.value) OVER (
								ORDER BY
									progress_element.ordinality
							)
						)
					WHEN 1 THEN
						progress_element.value < 0
					WHEN -1 THEN
						progress_element.value > 0
					ELSE
						TRUE
					END
				) AS element_is_valid
			FROM
				unnest(
					is_reading_progress_valid.reading_progress
				)
				WITH ORDINALITY
				AS
					progress_element (
						value,
						ordinality
					)
		) AS validation_check;
$$;

CREATE DOMAIN
	reading_progress
AS
	int[]
CHECK (
	is_reading_progress_valid(VALUE)
);

CREATE TABLE
	reader_article (
		reader_id  int REFERENCES reader (id),
		article_id int REFERENCES article (id),
		progress   reading_progress NOT NULL,
		date_read  timestamp,
		PRIMARY KEY (
			reader_id,
			article_id
		)
	);