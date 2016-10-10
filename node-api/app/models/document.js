var mongoose     = require('mongoose');
var Schema       = mongoose.Schema,
    ObjectId     = Schema.ObjectId;

var DocumentSchema   = new Schema({
    //_id: ObjectId,
    ID: String,
    User: String,
    Name: String,
    Tags: [String],
    TagString: String,
    FileId: ObjectId,
    //ImageThumb,
    FileType: String,
    CreateDate: Date
});

module.exports = mongoose.model('Document', DocumentSchema);
