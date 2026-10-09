# Instructor flow (draft)

## Canvas

| Column | Comes from | Note |
|---|---|---|
| `Student` | name_as_typed | What the student typed into the report; Canvas does not match on it. |
| `ID` | the identifier, when idColumn is ID | Empty otherwise. |
| `SIS User ID` | the identifier, when idColumn is SIS User ID | Empty otherwise. |
| `SIS Login ID` | the identifier, when idColumn is SIS Login ID (the default) | Empty otherwise. |
| `Section` | nothing | Always empty. |
| `<Activity name>` | points (or percent), one column per Activity | The second row holds the points possible. |

## Moodle

| Column | Comes from | Note |
|---|---|---|
| `ID number | Username | Email address` | the identifier; the header is the field idColumn names (ID number by default) | Map this column to the same field on the import page. |
| `Name as typed` | name_as_typed | Not an identifier; map it to Ignore. |
| `<Activity name>` | a percentage by default, or points | Map to a new or existing grade item. |
| `<Activity name> feedback` | the row summary in words, with the instructor-entered parts labelled | Map to that item as feedback. |

## D2L

| Column | Comes from | Note |
|---|---|---|
| `OrgDefinedId | Username` | the identifier; the header is the field idColumn names (OrgDefinedId by default) | Written as it is, without the # Brightspace puts in front of an id in its own export. |
| `<Activity name> Points Grade` | points earned, one column per Activity | The grade item of that name must exist. |
| `End-of-Line Indicator` | the character # | On every row, as the importer requires. |

## Marks

`schema` `submission` `fingerprint` `roster_id` `assignment_id` `name_as_typed` `lesson_id` `step_id` `step_title` `auto_verdict` `entered_by` `mark` `points_possible` `comment` `response_status` `response`
