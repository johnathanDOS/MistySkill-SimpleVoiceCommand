misty.SetDefaultVolume(20);

// Kicks everything off!
getAccessToken();


// Creates a unique session ID for opening a session with our Dialogflow
// agent.
function getSessionId(){
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Gets an access token for use with DialogFlow API
function getAccessToken() {
    misty.SendExternalRequest("POST",  _params.getAccessTokenUrl, null, null, null, false, false, null, "application/json", "SetAccessToken");
}

// Starts Misty listening for the "Hey, Misty!" key phrase.
function startListening() {
    // Starts key phrase recognition. Configures Misty to record the
    // speech she detects after recognizing the wake word.
    misty.StartKeyPhraseRecognition(true);

    // Registers a listener for VoiceRecord events. These events
    // trigger when Misty is finished capturing a speech recording.
    // Play a sound to let humans know that Misty is listening.
    misty.RegisterEvent("VoiceRecord", "VoiceRecord", 10, false);
    misty.Debug("Misty is listening and will beep when she hears 'Hey Misty'.");
    misty.PlayAudio("s_Joy3.wav");

    animateDefault();
}

/********************
Callback Functions
********************/

// Triggers when response data from getAccessToken call is ready.
// Stores token for use later with the DialogFlow API.
function SetAccessToken(data) {

    let response = JSON.parse(data.Result.ResponseObject.Data)
    misty.Set("googleAccessToken", response.accessToken);
    
    startListening();
}

// Callback for handling VoiceRecord event data. Prints a debug
// message and gets passes the captured speech file into the
// ProcessAudioFile() callback function. 
function _VoiceRecord() {
    misty.Debug("Speech captured.")
    misty.GetAudioFile("capture_HeyMisty.wav", "ProcessAudioFile");
}

// Sends speech recording to DialogFlow. Dialogflow uses 
// speech-to-text to match the recording with an "intent" we define in
// the DialogFlow project, then sends a response back with intent data.
// We use this response data to change Misty's LED.
function ProcessAudioFile(data) {

    // Set variable with base64 data for capture_HeyMisty audio file
    let base64 = data.Result.Base64;

    // Set up params for request to DialogFlow
    let sessionId = getSessionId();
	let url = "https://dialogflow.googleapis.com/v2/projects/" + _params.projectID + "/agent/sessions/" + sessionId + ":detectIntent";
    let authorizationType =  "Bearer";
    var dialogFlowParams = JSON.stringify({
        "queryInput": {
            "audioConfig": {
                "audioEncoding": "AUDIO_ENCODING_LINEAR_16",
                "languageCode": "en-US",
                "sampleRateHertz": 16000
            }
        },
        "inputAudio": base64
    });

    let accessToken = misty.Get("googleAccessToken");

    misty.SendExternalRequest("POST", url, authorizationType, accessToken, dialogFlowParams, false, false, null, "application/json", "ProcessDialogFlowResponse");
}

// Handles response from Dialogflow agent
function ProcessDialogFlowResponse(data) {
    
    // Gets the intent and parameters from the response
    let response = JSON.parse(data.Result.ResponseObject.Data)
    var intent = response.queryResult.intent.displayName;
    var parameters = response.queryResult.parameters;

    // Prints some debug messages with contents of the response
    misty.Debug("Intent: " + intent);
    misty.Debug("Input text: " + response.queryResult.queryText);
    misty.Debug("Color: " + parameters.color);

    // Handles ChangeLED intents. If the color is red, green, or blue,
    // Misty plays a happy sound and changes her color. 
    if (intent == "ChangeLED") {
        switch(parameters.color) {
            case "red":
                misty.ChangeLED(255, 0, 0);
                animateCompliance();
                break;
            case "blue":
                misty.ChangeLED(0, 0, 255);
                animateCompliance();
                break;
            case "green":
                misty.ChangeLED(0, 255, 0);
                animateCompliance();
                break;
            // Right now, this skill only works with red, green, or
            // blue. If you say another color, Misty makes a confused
            // sound and starts listening again.
            default:
                animateConfusion();
                misty.Debug("Sorry, I didn't catch that. Say it again?");
                misty.Pause(2000);
                startListening();
                return;
        }
    }
    // If Dialogflow couldn't match the recorded utterance to an
    // intent, Misty plays a confused sound and starts listening again.
    else {
        misty.PlayAudio("s_DisorientedConfused3.wav");
        misty.Debug("Sorry, I didn't catch that. Say it again?");
        misty.Pause(2000);
        startListening();
        return;
    }

    // Waits five seconds, then starts listening again.
    misty.Pause(5000);
    animateDefault();
    startListening();
}

function animateConfusion() {
    misty.MoveHeadDegrees(-10, 30, 0, 100);
    misty.PlayAudio("s_DisorientedConfused3.wav");
    misty.DisplayImage("e_ApprehensionConcerned.jpg");
    misty.MoveArms(-25, 90, 100, 100);
}

function animateDefault() {
    misty.MoveHeadDegrees(0, 0, 0, 100);
    misty.MoveArms(90, 90, 100, 100);
}

function animateCompliance() {
    misty.MoveHeadDegrees(-15, 0, 0, 100);
    misty.PlayAudio("s_Acceptance.wav");
    misty.DisplayImage("e_Joy2.jpg");
    misty.MoveArms(0, -25, 100, 100);
}