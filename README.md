aqlame bus
===

A light weight javascript messaging engine. It is used by (http://aqla.me Aqlame) extensively.

## Usage
Aqlame bus usage is very simple. A part of your code (subscriber) tells aqlame bus that it is interested in receiving a certain message type. Another part of your code (publisher) uses aqlame bus to publish its messages. Aqlame bus job is to deliver the messages to the interested subscribers.

### Subscriber
The subscriber registers a call back function that will receive the messages. The following is a sample code:

`bus.register(subject, function(id, message, subject, source){
		...
	});`
	
_subject_: A text of the message type name. The callback will receive only meesages of this type.
	  
_id_: A unique identifier for this subscriber. It can be used to unregister the subscriber if you aren't interested anymore to receive this message type.
	  
_message_: The message as sent by the publisher.
	  
_source_: optionaly the publisher can set this text to identify itself to the subscriber.
	  
The register call returns a subscriber ID that can be used to unregister the subscriber if you aren't interested anymore to receive this message type. The following code can be used to unregister the subscriber:

`bus.unregister(id);`

### publisher
`bus.send(subject, message, source);`

_subject_: A text of the message type name. The callback will receive only meesages of this type.
	  
_message_: The message as sent by the publisher.

_source_: optionaly the publisher can set this text to identify itself to the subscriber.
