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