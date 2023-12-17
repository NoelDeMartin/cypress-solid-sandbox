import { FieldType } from 'soukai';
import { defineSolidModelSchema } from 'soukai-solid';

export default defineSolidModelSchema({
    rdfContext: 'https://schema.org/',
    rdfsClass: 'Action',
    fields: {
        name: {
            type: FieldType.String,
            required: true,
        },
    },
});
