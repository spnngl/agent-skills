#ifndef KV_PARSE_H
#define KV_PARSE_H

#include <stddef.h>
#include <stdint.h>

/* Bit set in `flags` when the value was empty (`key=`). */
#define KV_FLAG_EMPTY_VALUE 0x1u

/* Borrowed views into the input buffer; valid only as long as the input. */
typedef struct {
    const char *key;
    size_t key_len;
    const char *value;
    size_t value_len;
    uint32_t flags;
} kv_out;

/*
 * Parses `key=value` from `input[0..len)` (not NUL-terminated).
 * Returns 0 on success and fills `out`; on error `out` is left untouched:
 *   -1  no '=' in the input
 *   -2  empty key
 *   -3  `input` or `out` is NULL
 */
int parse(const char *input, size_t len, kv_out *out);

#endif
