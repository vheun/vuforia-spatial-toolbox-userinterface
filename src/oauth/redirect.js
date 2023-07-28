import { saveToken } from "./tokens.js";

function handleError(error, toolboxUrl) {
    console.error(error);
    document.querySelector('h1').classList.add('error');
    if (toolboxUrl) {
        document.querySelector('h1').innerText = `SERVER ERROR (Redirecting...)`;
        setTimeout(() => {
            window.location = toolboxUrl;
        }, 3000);
    } else {
        document.querySelector('h1').innerText = `SERVER ERROR (Unable to Redirect)`;
    }
}

window.onload = () => {
    const parameters = new URLSearchParams(window.location.search);
    // Success: ?code=<code>&state=<state>
    // Error: ?error=<error_code>&state=<state>
    const code = parameters.get('code');
    const error = parameters.get('error');
    const nonce = parameters.get('state');
    const state = JSON.parse(localStorage.getItem('activeOAuthState')) || {};
    if (localStorage.getItem('activeOAuthNonce') !== nonce) {
        handleError(`${localStorage.getItem('activeOAuthNonce')} does not match ${nonce}`, state.toolboxUrl);
        localStorage.removeItem('activeOAuthNonce');
        localStorage.removeItem('activeOAuthState');
        return;
    }
    localStorage.removeItem('activeOAuthNonce');
    localStorage.removeItem('activeOAuthState');
    if (code) {
        const data = {
            'code': code,
            'frameName': state.frameName,
            'redirect_uri': window.location.origin + window.location.pathname,
        }
        const serverUrl = `${state.edgeServer}/oauthAcquire`;
        fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(data)
        }).then(response => {
            return response.json();
        }).then(data => {
            if (data.error) {
                handleError(data.error, state.toolboxUrl);
                return;
            }
            saveToken(data, state.frameName);
            window.location = state.toolboxUrl;
        }).catch(error => {
            console.error(error);
        });
    } else {
        handleError(error, state.toolboxUrl);
    }
}
