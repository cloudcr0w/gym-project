const express = require('express');
console.log("Working...");
const session = require('express-session');
const { Issuer, generators } = require('openid-client');
const app = express();
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

      
let client;
// Initialize OpenID Client
async function initializeClient() {
    const issuer = await Issuer.discover('https://cognito-idp.us-east-1.amazonaws.com/us-east-1_rt8yEUBqN');
    client = new issuer.Client({
        client_id: '7771uqoeprf1rtpvf1pnrahu62',
        client_secret: 'mj1le0r8gllnte2spav00mldbu15vof5rgghqftgn998vo674p7',
        redirect_uris: ['https://d84l1y8p4kdic.cloudfront.net'],
        response_types: ['code']
    });
};
initializeClient().catch(console.error);
app.use(session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: false
}));
const checkAuth = (req, res, next) => {
    if (!req.session.userInfo) {
        req.isAuthenticated = false;
    } else {
        req.isAuthenticated = true;
    }
    next();
};
app.get('/', checkAuth, (req, res) => {
    res.render('home', {
        isAuthenticated: req.isAuthenticated,
        userInfo: req.session.userInfo
    });
});
app.get('/login', (req, res) => {
    const nonce = generators.nonce();
    const state = generators.state();

    req.session.nonce = nonce;
    req.session.state = state;

    const authUrl = client.authorizationUrl({
        scope: 'phone openid email',
        state: state,
        nonce: nonce,
    });

    res.redirect(authUrl);
});
// Helper function to get the path from the URL. Example: "http://localhost/hello" returns "/hello"
function getPathFromURL(urlString) {
    try {
        const url = new URL(urlString);
        return url.pathname;
    } catch (error) {
        console.error('Invalid URL:', error);
        return null;
    }
}

app.get(getPathFromURL('https://d84l1y8p4kdic.cloudfront.net'), async (req, res) => {
    try {
        const params = client.callbackParams(req);
        const tokenSet = await client.callback(
            'https://d84l1y8p4kdic.cloudfront.net',
            params,
            {
                nonce: req.session.nonce,
                state: req.session.state
            }
        );

        const userInfo = await client.userinfo(tokenSet.access_token);
        req.session.userInfo = userInfo;

        res.redirect('/');
    } catch (err) {
        console.error('Callback error:', err);
        res.redirect('/');
    }
});
// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    const logoutUrl = `https://us-east-1rt8yeubqn.auth.us-east-1.amazoncognito.com/logout?client_id=7771uqoeprf1rtpvf1pnrahu62&logout_uri=https://d84l1y8p4kdic.cloudfront.net`;
    res.redirect(logoutUrl);
});
app.set('view engine', 'ejs');
app.listen(8080, (err) => {
    if (err) {
        console.error("Error in connection to server:", err);
    } else {
        console.log("Server is working on http://localhost:8080");
    }
});
// Dodajemy endpoint rejestracji
app.post('/register', async (req, res) => {
    const { email, password, given_name } = req.body;  // Pobieramy dane z body żądania

    // Parametry dla Cognito (w tym ClientId z Cognito)
    const params = {
        ClientId: 'YOUR_APP_CLIENT_ID',  // Użyj swojego App Client ID
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'given_name', Value: given_name }, // Dodaj inne atrybuty, jeśli chcesz
        ],
    };

    try {
        // Wywołujemy metodę signUp na Cognito
        await cognito.signUp(params).promise();
        res.status(200).send('User registered successfully!');
    } catch (err) {
        console.error(err);
        res.status(400).send('Error during registration');
    }
});// Dodajemy endpoint logowania
app.post('/login', async (req, res) => {
    const { email, password } = req.body;  // Pobieramy dane z body żądania

    // Parametry do autoryzacji
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',  // Używamy tego przepływu autoryzacji
        ClientId: 'YOUR_APP_CLIENT_ID',  // Użyj swojego App Client ID
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    };

    try {
        // Wywołujemy metodę initiateAuth na Cognito
        const data = await cognito.initiateAuth(params).promise();
        
        // Zwracamy token dostępu, jeśli logowanie się powiodło
        res.status(200).send({
            message: 'Login successful!',
            accessToken: data.AuthenticationResult.AccessToken,
        });
    } catch (err) {
        console.error(err);
        res.status(400).send('Login failed');
    }
});


