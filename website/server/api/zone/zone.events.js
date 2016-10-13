/**
 * Zone model events
 */

'use strict';

import {EventEmitter} from 'events';
import Zone from './zone.model';
var ZoneEvents = new EventEmitter();

// Set max event listeners (0 == unlimited)
ZoneEvents.setMaxListeners(0);

// Model events
var events = {
  save: 'save',
  remove: 'remove'
};

// Register the event emitter to the model events
for(var e in events) {
  let event = events[e];
  Zone.schema.post(e, emitEvent(event));
}

function emitEvent(event) {
  return function(doc) {
    ZoneEvents.emit(event + ':' + doc._id, doc);
    ZoneEvents.emit(event, doc);
  };
}

export default ZoneEvents;
