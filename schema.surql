-- Define the scope for Google OAuth2
DEFINE SCOPE google_oauth SESSION 24h
  SIGNUP (CREATE user SET email = $email, name = $name)
  SIGNIN (SELECT * FROM user WHERE email = $email);

-- Define the table for storing OAuth states
DEFINE TABLE oauth_state SCHEMAFULL;

-- Define fields for oauth_state
DEFINE FIELD client_id ON oauth_state TYPE string;
DEFINE FIELD code_verifier ON oauth_state TYPE string;
DEFINE FIELD code_challenge ON oauth_state TYPE string;
DEFINE FIELD state ON oauth_state TYPE string;
DEFINE FIELD redirect_uri ON oauth_state TYPE string;
DEFINE FIELD created_at ON oauth_state TYPE datetime DEFAULT time::now();
DEFINE FIELD expires_at ON oauth_state TYPE datetime;

-- Define indexes
DEFINE INDEX idx_state ON oauth_state FIELDS state UNIQUE;
DEFINE INDEX idx_expires_at ON oauth_state FIELDS expires_at;

-- Define the users table
DEFINE TABLE user SCHEMAFULL;

-- Define fields for user
DEFINE FIELD email ON user TYPE string;
DEFINE FIELD name ON user TYPE string;
DEFINE FIELD google_id ON user TYPE string;
DEFINE FIELD access_token ON user TYPE string;
DEFINE FIELD refresh_token ON user TYPE string;
DEFINE FIELD token_expires_at ON user TYPE datetime;

-- Define indexes for user
DEFINE INDEX idx_email ON user FIELDS email UNIQUE;
DEFINE INDEX idx_google_id ON user FIELDS google_id UNIQUE;




DEFINE TABLE newspapers SCHEMAFULL;
DEFINE FIELD id ON newspapers TYPE string ASSERT $value IS uuid();
DEFINE FIELD avatar ON newspapers TYPE string;
DEFINE FIELD name ON newspapers TYPE string ASSERT $value IS string AND string::length($value) <= 40;
DEFINE FIELD background ON newspapers TYPE string;
DEFINE FIELD created_at ON newspapers TYPE datetime VALUE time::now();

DEFINE FIELD rank ON journalists TYPE string ASSERT $value IN ["author", "editor", "owner"];
DEFINE TABLE journalists SCHEMAFULL;
DEFINE FIELD user_id ON journalists TYPE string;
DEFINE FIELD newspaper_id ON journalists TYPE string;
DEFINE INDEX user_newspaper_index ON journalists FIELDS user_id, newspaper_id UNIQUE;

DEFINE TABLE articles SCHEMAFULL;
DEFINE FIELD id ON articles TYPE string ASSERT $value IS uuid();
DEFINE FIELD title ON articles TYPE string ASSERT $value IS string AND string::length($value) <= 40;
DEFINE FIELD content ON articles TYPE string;
DEFINE FIELD author_id ON articles TYPE string;
DEFINE FIELD newspaper_id ON articles TYPE string;
DEFINE FIELD created_at ON articles TYPE datetime VALUE time::now();

DEFINE TABLE upvotes SCHEMAFULL;
DEFINE FIELD user_id ON upvotes TYPE string;
DEFINE FIELD article_id ON upvotes TYPE string;
DEFINE INDEX user_article_index ON upvotes FIELDS user_id, article_id UNIQUE;
