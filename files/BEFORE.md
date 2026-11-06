# Retained before evidence (supplied, not rerun)

The exact native PNG failure was reproduced once on unchanged main 955785c08ed00910bc83e3aa3bbb0a54703f6f71. Original sd-mango-c-f56 head 9f5128e6da762065dbf8b79ddbe3f37a0e95efef had matching production bytes for this defect and remains PARTIAL. The original f61 continuation ended terminal READY at 929a790d at 00:29:55 with this defect still present; only its abbreviated head was supplied, and no full SHA is invented here.

Fixture: complete tests/support/images png(8,6,156), with a valid tEXt chunk inserted after byte 33. Its data is Description NUL synthetic-mango-156-person-6, followed by CRC32(type+data). The first CRC byte is ASCII z. A native never-subscribed contact used that identifier and synthetic-mango-156@example.test. Authenticated multipart POST /api/campaign-assets returned 201 and its public URL. Authenticated native erasure and continuations through maintained eraseHttp completed with removed.stored_objects=0. Unauthenticated GET remained 200 with byte-identical original. Expected removal and 410.

This packet records that supplied failure as retained evidence. It neither reruns nor changes the original format-matrix proof, original gate outcome or original lifetime.
