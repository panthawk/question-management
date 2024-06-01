const http = require("http");
const fs = require("fs");
const urll = require("url");
const querystring = require("querystring");
const Datastore = require("nedb");
const path = require("path");
require("dotenv").config();
const formidable = require("formidable");

// Specify the path to the existing NeDB database file
const booksDBPath = "revision.db";

const booksDB = new Datastore({ filename: booksDBPath, autoload: true });

const questionsDB = new Datastore({
  filename: "question.db",
  autoload: true,
});

const db = new Datastore({ filename: "comments.db", autoload: true });

const server = http.createServer((req, res) => {
  // Parse the URL and method from the request
  // Create Multer instance with storage options

  const { method, url } = req;

  // Handle POST requests to /books endpoint
  if (method === "GET" && url === "/") {
    fs.readFile("index.html", (err, data) => {
      if (err) {
        console.log(err);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else {
        // Send the contents of index.html as the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  }
  // Handle POST requests to /questions endpoint
  // Handle POST requests to /p-book endpoint
  else if (method === "POST" && url === "/p-book") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      // Parse the form data
      const formData = querystring.parse(body);
      const bookName = formData.bookName;
      const bookDisc = formData.bookDescription;
      const bookSubject = formData.bookSubject;

      // Check if the book name already exists in the NeDB database
      booksDB.findOne(
        { name: bookName, sub: bookSubject },
        (err, existingDoc) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: err.message }));
          } else if (existingDoc) {
            // Book name already exists, return an error
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Book already exists" }));
          } else {
            // Insert the book name into the NeDB datastore
            booksDB.insert(
              { name: bookName, disc: bookDisc, sub: bookSubject },
              (err, newDoc) => {
                if (err) {
                  res.writeHead(500, { "Content-Type": "application/json" });
                  res.end(JSON.stringify({ error: err.message }));
                } else {
                  res.writeHead(201, { "Content-Type": "application/json" });
                  res.end(
                    JSON.stringify({
                      message: "Book inserted successfully",
                      book: newDoc,
                    })
                  );
                }
              }
            );
          }
        }
      );
    });
  } else if (method === "GET" && urll.parse(req.url).pathname === "/books") {
    const parsedUrl = urll.parse(req.url);
    const queryParams = querystring.parse(parsedUrl.query);

    const subject = queryParams.subject;

    let queryObject = {};
    if (subject && subject !== "ALL") {
      queryObject = { sub: subject };
    }

    booksDB.find(queryObject, (err, books) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(books));
      }
    });
  } else if (method === "GET" && url === "/subjects") {
    // Fetch all unique subjects from the database
    booksDB
      .find({})
      .projection({ sub: 1, _id: 0 })
      .exec((err, subjects) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          // Extract unique subjects from the array using Set
          const uniqueSubjects = [
            ...new Set(subjects.map((subject) => subject.sub)),
          ];

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(uniqueSubjects));
        }
      });
  }
  // Handle POST requests to /p-question endpoint
  else if (method === "POST" && url === "/p-question") {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error parsing form data" }));
        return;
      }

      const {
        bookName = "",
        questionNumber = "",
        priority = "",
        familiarity = "",
        question = "",
      } = fields;
      const { image } = files; // Get the uploaded image file

      console.log("image is pathis " + image["Path"]);
      // Check if the question already exists in the NeDB database
      questionsDB.findOne({ bookName, questionNumber }, (err, existingDoc) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else if (existingDoc) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "Question already exists" }));
        } else {
          // Save the image file
          const imagePath = `uploads/${bookName}_${questionNumber}`;
          fs.rename(image.Path, imagePath, (err) => {
            if (err) {
              console.log(err);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Error saving image file" }));
              return;
            }

            // Insert the question into the NeDB datastore
            const repetitions = 0; // Initial repetitions
            const today = new Date().toISOString().slice(0, 10); // Today's date
            const questionData = {
              bookName,
              questionNumber,
              priority,
              familiarity,
              repetitions,
              date: today,
              question,
              image: imagePath,
            };

            questionsDB.insert(questionData, (err, newDoc) => {
              if (err) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    message: "Question inserted successfully",
                    question: newDoc,
                  })
                );
              }
            });
          });
        }
      });
    });
  }

  // Handle GET requests to /books endpoint
  else if (method === "GET" && url === "/formHtml.html") {
    fs.readFile("formHtml.html", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else {
        // Send the contents of index.html as the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  } else if (method === "GET" && url === "/get-questions") {
    fetchAllQuestions((err, questions) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(questions));
      }
    });
  } else if (method === "GET" && url === "/ql.html") {
    fs.readFile("ql.html", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else {
        // Send the contents of index.html as the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  }

  // Handle GET request to /books endpoint
  else if (method === "GET" && url === "/books") {
    booksDB.find({}, (err, books) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(books));
      }
    });
  }

  // Handle GET requests to /books endpoint
  else if (method === "GET" && url === "/question.html") {
    fs.readFile("question.html", (err, data) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      } else {
        // Send the contents of index.html as the response
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data);
      }
    });
  }
  // Handle GET requests to /questions endpoint
  else if (method === "GET" && url === "/questions") {
    // Handle retrieving all questions
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Retrieving all questions" }));
  } else if (method === "GET" && url === "/no-q") {
    questionsDB.find({}, (err, questions) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      } else {
        const filteredQuestions = questions;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ numberOfQuestions: filteredQuestions.length })
        );
      }
    });
  }
  // handle comment get end point
  else if (
    method === "GET" &&
    urll.parse(req.url).pathname === "/get-comment"
  ) {
    const parsedUrl = urll.parse(req.url);
    const queryParams = querystring.parse(parsedUrl.query);

    const bookName = queryParams.bookName;
    const questionNumber = queryParams.questionNumber;

    console.log(bookName, questionNumber);

    // Find the comment corresponding to the bookName and questionNumber
    db.findOne(
      { bookName: bookName, questionNumber: questionNumber },
      (err, comment) => {
        if (err) {
          // res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal server error" }));
        } else {
          if (comment) {
            // res.writeHead(200, { "Content-Type": "application/json" });
            console.log(comment.comment);
            res.end(JSON.stringify({ comment: comment.comment }));
          } else {
            //  res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ comment: "" })); // Send an empty comment if not found
          }
        }
      }
    );
  }

  // Handle GET requests to /questions endpoint
  else if (method === "POST" && url === "/save-questions") {
    handlePostRequest(req, res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "question saved" }));
  }
  // Handle GET requests to /save-comment endpoint
  else if (method === "POST" && url === "/save-comment") {
    handleCommentquest(req, res);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "comment saved" }));
  } else if (method === "GET" && url === "/reports") {
    generateReports((err, reports) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      } else {
        res.writeHead(200, { "Content-Type": "application/json" });
        console.log(reports);
        res.end(JSON.stringify(reports));
      }
    });
  }
  // Handle unsupported routes
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Set the port for the server to listen on
const port = process.env.PORT;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Function to fetch all questions from the database
const fetchAllQuestions = (callback) => {
  questionsDB.find({}, (err, questions) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, multiFactoredAlgo(questions));
    }
  });
};

const handlePostRequest = (req, res) => {
  if (req.url === "/save-questions") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const updatedQuestions = JSON.parse(body);
      const today = new Date().toISOString().slice(0, 10); // Today's date

      let errors = [];
      let processed = 0;

      updatedQuestions.forEach((question, index, array) => {
        // Ensure repetitions is a number
        question.repetitions = parseInt(question.repetitions, 10);

        questionsDB.update(
          {
            bookName: question.bookName,
            questionNumber: question.questionNumber,
          },
          {
            $set: {
              priority: question.priority.trim(),
              familiarity: question.familiarity.trim(),
              date: today,
            },
            $inc: { repetitions: 1 },
          },
          {},
          (err, numReplaced) => {
            if (err) {
              errors.push({ error: err.message, question });
            }
            processed++;
            if (processed === array.length) {
              if (errors.length > 0) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ errors }));
              } else {
                res.end(
                  JSON.stringify({ message: "Changes saved successfully" })
                );
              }
            }
            questionsDB.loadDatabase();
          }
        );
      });
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
};

const multiFactoredAlgo = (questions) => {
  const limit = parseInt(process.env.LIMIT);
  const weights = {
    priority: parseInt(process.env.PRIORITY),
    familiarity: parseInt(process.env.FAMILARITY),
    repetitions: parseInt(process.env.REPEAT),
    timeGap: parseInt(process.env.TIMEGAP),
  };

  const today = new Date();

  questions.forEach((question) => {
    const priorityScore =
      parseInt(question.priority, 10) * process.env.PRIORITY;
    const familiarityScore =
      parseInt(question.familiarity, 10) * process.env.FAMILARITY;
    const lastSeenDate = new Date(question.date);
    const timeGapDays = Math.floor(
      (today - lastSeenDate) / (1000 * 60 * 60 * 24)
    );
    const timeGapScore = timeGapDays * process.env.TIMEGAP;

    const invertedRepetitions = 1 / (parseInt(question.repetitions, 10) + 1);

    const repetitionScore = invertedRepetitions * process.env.REPEAT; // Adding 1 to avoid 0 multiplication

    question.weightedScore =
      priorityScore + familiarityScore + timeGapScore + repetitionScore;
  });

  let filteredQuestions;
  subjectFilter = process.env.SUB + "";
  console.log(subjectFilter);
  if (subjectFilter.toUpperCase() === "ALL") {
    filteredQuestions = questions;
  } else {
    filteredQuestions = questions.filter(
      (question) => question.bookName === subjectFilter
    );
  }

  filteredQuestions.sort((a, b) => b.weightedScore - a.weightedScore);

  return filteredQuestions.slice(0, limit);
};

const generateReports = (callback) => {
  const reports = {
    numberOfQuestions: 0,
    notRepeatedCount: 0,
    priorityGreaterThan4Count: 0,
    familiarityDistribution: {},
    priorityDistribution: {},
    // Add more reports as needed
  };

  // Fetch all questions from the database
  questionsDB.find({}, (err, questions) => {
    if (err) {
      callback(err, null);
    } else {
      // Calculate the number of questions
      reports.numberOfQuestions = questions.length;

      // Calculate the number of questions still not repeated
      reports.notRepeatedCount = questions.filter(
        (question) => question.repetitions === 0
      ).length;

      // Calculate the number of questions with priority greater than 4
      reports.priorityGreaterThan4Count = questions.filter(
        (question) => parseInt(question.priority) >= 4
      ).length;

      // Calculate the familiarity distribution
      reports.familiarityDistribution =
        calculateFamiliarityDistribution(questions);

      // Calculate the priority distribution
      reports.priorityDistribution = calculatePriorityDistribution(questions);

      // Return the generated reports
      callback(null, reports);
    }
  });
};

const calculateFamiliarityDistribution = (questions) => {
  const distribution = {};
  questions.forEach((question) => {
    const familiarity = question.familiarity;
    if (distribution[familiarity]) {
      distribution[familiarity]++;
    } else {
      distribution[familiarity] = 1;
    }
  });
  return distribution;
};

// New function to calculate priority distribution
const calculatePriorityDistribution = (questions) => {
  const distribution = {};
  questions.forEach((question) => {
    const priority = question.priority;
    if (distribution[priority]) {
      distribution[priority]++;
    } else {
      distribution[priority] = 1;
    }
  });
  return distribution;
};

const handleCommentquest = (req, res) => {
  let body = "";

  // Collect the body data
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  // End the request
  req.on("end", () => {
    try {
      // Parse the JSON body
      const data = JSON.parse(body);

      // Construct query to find existing comment
      const query = {
        bookName: data.bookName,
        questionNumber: data.questionNumber,
      };

      // Check if a document with the same bookName and questionNumber already exists
      db.findOne(query, (err, existingDoc) => {
        if (err) {
          // res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        } else if (existingDoc) {
          // Update the existing comment
          console.log("Updating a old comment");
          db.update(
            query,
            { $set: { comment: data.comment } },
            {},
            (err, numReplaced) => {
              if (err) {
                //   res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                //   res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Comment updated" }));
              }
              db.loadDatabase();
            }
          );
        } else {
          // Insert a new comment
          console.log("inserting a new comment");
          db.insert(
            {
              bookName: data.bookName,
              questionNumber: data.questionNumber,
              comment: data.comment,
            },
            (err, newDoc) => {
              if (err) {
                // res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: err.message }));
              } else {
                //  res.writeHead(201, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    message: "Comment inserted successfully",
                    book: data,
                  })
                );
              }
            }
          );
        }
      });
    } catch (error) {
      // Handle JSON parsing error
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
    }
  });
};
