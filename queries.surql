-- Create a new OAuth state record
DEFINE FUNCTION   fn::create_oauth_state($client_id: string, $code_verifier: string, $code_challenge: string, $state: string, $redirect_uri: string) {
    CREATE oauth_state CONTENT {
        client_id: $client_id,
        code_verifier: $code_verifier,
        code_challenge: $code_challenge,
        state: $state,
        redirect_uri: $redirect_uri,
        expires_at: time::now() + 10m
    };
};

-- Verify and retrieve OAuth state
DEFINE FUNCTION    fn::verify_oauth_state($state: string) {
    LET $oauth_state = (SELECT * FROM oauth_state WHERE state = $state AND expires_at > time::now() LIMIT 1);
    RETURN $oauth_state;
};

-- Create or update user after successful OAuth
DEFINE FUNCTION    fn::upsert_oauth_user($email: string, $name: string, $google_id: string, $access_token: string, $refresh_token: string, $expires_in: int) {
    LET $user = (
        SELECT * FROM user WHERE email = $email LIMIT 1
    );

    IF $user == NONE {
        CREATE user CONTENT {
            email: $email,
            name: $name,
            google_id: $google_id,
            access_token: $access_token,
            refresh_token: $refresh_token,
            token_expires_at: time::now() + duration::from::secs($expires_in)
        }
    } ELSE {
        UPDATE user SET 
            name = $name,
            google_id = $google_id,
            access_token = $access_token,
            refresh_token = $refresh_token,
            token_expires_at = time::now() + duration::from::secs($expires_in)
        WHERE email = $email
    };
};

-- Clean up expired OAuth states
DEFINE FUNCTION    fn::cleanup_expired_states() {
    DELETE FROM oauth_state WHERE expires_at < time::now();
};