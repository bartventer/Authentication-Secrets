# NodeJS Authentication and encryption website

* Users need to register or login in order to access the homepage.
* Users email and encrypted password is stored on a MongoDB database.
* User passwords are encrypted with mongoose-encrypt package.
* Encryption-keys are safely hidden as environment variables.
* When a user logs-in, firstly their email address gets queried on the database, if there is a match then the binary-encoded password on the DB gets deciphered to JSON, then the JSON is parsed, and the individual fields are inserted back into the document as their original data types, at this point the decoded password gets compared to the password as entered by the user on the website login page, if successfull, the home page will be rendered.
