#include "kv_parse.h"

#include <string.h>

int parse(const char *input, size_t len, kv_out *out) {
    if (input == NULL || out == NULL) {
        return -3;
    }
    const char *eq = memchr(input, '=', len);
    if (eq == NULL) {
        return -1;
    }
    size_t key_len = (size_t)(eq - input);
    if (key_len == 0) {
        return -2;
    }
    out->key = input;
    out->key_len = key_len;
    out->value = eq + 1;
    out->value_len = len - key_len - 1;
    out->flags = out->value_len == 0 ? KV_FLAG_EMPTY_VALUE : 0;
    return 0;
}
