const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "userData.db");

const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () =>
      console.log("Server is running in http://localhost:3001")
    );
  } catch (e) {
    console.log(`DB Error :${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const bcrypt = require("bcrypt");

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const checkUser = `
  SELECT *
  FROM user
  WHERE username = '${username}';`;

  const dbUser = await db.get(checkUser);

  if (dbUser === undefined) {
    let postNewUserQuery = `
            INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
    if (password.length < 5) {
      response.status = 400;
      response.send("Password is too short");
    } else {
      let newUserDetails = await db.run(postNewUserQuery);
      response.status = 200;
      response.send("User created successfully");
    }
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUser = `
    SELECT *
    FROM user
    WHERE username = '${username}';`;

  const dbUser = await db.get(checkUser);

  if (dbUser === undefined) {
    response.status = 400;
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status = 200;
      response.send("Login success!");
    } else {
      response.status = 400;
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkUser = `
    SELECT * FROM user 
    WHERE username = '${username}';`;

  const dbUser = await db.get(checkUser);

  const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
  if (isValidPassword === false) {
    response.status = 400;
    response.send("Invalid current password");
  } else {
    if (newPassword.length < 5) {
      response.status = 400;
      response.send("Password is too short");
    } else {
      const updatedPassword = await bcrypt.hash(newPassword, 10);
      const updateNewPassword = `
      update user
      set password = '${updatedPassword}'
      WHERE username = "${username}";`;

      await db.run(updateNewPassword);

      response.send("Password updated");
    }
  }
});

module.exports = app;
