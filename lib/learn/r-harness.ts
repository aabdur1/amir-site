// lib/learn/r-harness.ts — the R side of the 10/ R sandbox: master data.frame
// construction, a fresh environment per run, and the checker. Comparison
// mirrors lib/learn/sql-check.ts semantics: positional (renames pass),
// canonical row sort unless `ordered`, numeric atol 1e-9, NA ≡ NA, trimmed
// strings, Dates/POSIXct compared as times. R has no index, so pandas'
// reset_index() dual-candidate mechanism has no analog here. Evaluated once
// at engine init by components/learn/r.tsx AND by
// scripts/verify-r-exercises.mjs — keep it free of browser/Node specifics.
//
// String.raw so R escapes like '\n' and '￿' reach the R parser intact.
// Do not introduce backticks or ${ into the R code.

export const R_SETUP_CODE = String.raw`
suppressPackageStartupMessages(library(dplyr))

.webr_master <- new.env(parent = emptyenv())
.webr_head <- 50
.webr_eps <- 1e-9

.webr_build <- function(dir) {
  read_one <- function(file, date_cols = character(0), time_cols = character(0)) {
    df <- utils::read.csv(file.path(dir, file), stringsAsFactors = FALSE,
                          na.strings = c('NA', ''))
    for (col in date_cols) df[[col]] <- as.Date(df[[col]])
    for (col in time_cols) {
      df[[col]] <- as.POSIXct(df[[col]], tz = 'UTC',
        tryFormats = c('%Y-%m-%d %H:%M:%OS', '%Y-%m-%d %H:%M', '%Y-%m-%d'))
    }
    df
  }
  .webr_master$patients <- read_one('patients.csv', date_cols = 'birth_date')
  .webr_master$encounters <- read_one('encounters.csv',
    date_cols = c('admit_date', 'discharge_date'))
  .webr_master$labs <- read_one('labs.csv', time_cols = 'taken_at')
  .webr_master$medications <- read_one('medications.csv',
    date_cols = c('start_date', 'end_date'))
  invisible(NULL)
}

# Fresh environment per run: R's copy-on-modify means user assignments can
# never mutate the masters (data.table, the by-reference mutator, is never
# loaded). Parent is globalenv() so attached packages stay visible.
.webr_fresh_env <- function() {
  env <- new.env(parent = globalenv())
  env$patients <- .webr_master$patients
  env$encounters <- .webr_master$encounters
  env$labs <- .webr_master$labs
  env$medications <- .webr_master$medications
  env
}

.webr_run_user <- function(code) {
  env <- .webr_fresh_env()
  lines <- character(0)
  con <- textConnection('lines', open = 'w', local = TRUE)
  sink(con)
  err <- tryCatch({
    exprs <- parse(text = code)
    for (e in exprs) eval(e, envir = env)
    NULL
  }, error = function(cond) conditionMessage(cond))
  sink()
  close(con)
  list(env = env, stdout = paste(lines, collapse = '\n'), error = err)
}

.webr_as_frame <- function(obj) {
  if (is.data.frame(obj)) {
    df <- as.data.frame(obj, stringsAsFactors = FALSE)
  } else if (!is.null(obj) && is.atomic(obj) && is.null(dim(obj))) {
    df <- data.frame(value = obj, stringsAsFactors = FALSE)
  } else {
    return(NULL)
  }
  row.names(df) <- NULL
  df[] <- lapply(df, function(col) if (is.factor(col)) as.character(col) else col)
  df
}

.webr_is_time <- function(x) inherits(x, 'Date') || inherits(x, 'POSIXt')

.webr_time_num <- function(x) {
  if (inherits(x, 'POSIXt')) return(as.numeric(x))
  if (inherits(x, 'Date')) return(as.numeric(as.POSIXct(format(x), tz = 'UTC')))
  if (is.character(x)) {
    return(tryCatch(
      as.numeric(as.POSIXct(x, tz = 'UTC',
        tryFormats = c('%Y-%m-%d %H:%M:%OS', '%Y-%m-%d %H:%M', '%Y-%m-%d'))),
      error = function(cond) NULL))
  }
  NULL
}

.webr_col_equal <- function(u, e) {
  na_u <- is.na(u)
  na_e <- is.na(e)
  eq <- na_u & na_e
  both <- which(!na_u & !na_e)
  if (length(both) == 0) return(eq)
  if (.webr_is_time(u) || .webr_is_time(e)) {
    tu <- .webr_time_num(u)
    te <- .webr_time_num(e)
    if (is.null(tu) || is.null(te)) return(eq)
    eq[both] <- abs(tu[both] - te[both]) < 1
  } else if (is.numeric(u) && is.numeric(e)) {
    eq[both] <- (u[both] == e[both]) | (abs(u[both] - e[both]) <= .webr_eps)
  } else if (is.logical(u) && is.logical(e)) {
    eq[both] <- u[both] == e[both]
  } else if (!is.numeric(u) && !is.numeric(e)) {
    eq[both] <- trimws(as.character(u[both])) == trimws(as.character(e[both]))
  }
  eq
}

.webr_canonical_order <- function(df) {
  if (nrow(df) == 0) return(integer(0))
  keys <- lapply(df, function(col) {
    if (.webr_is_time(col)) {
      k <- format(col, '%Y-%m-%dT%H:%M:%S', tz = 'UTC')
    } else if (is.numeric(col)) {
      k <- sprintf('%.9f', col)
    } else {
      k <- trimws(as.character(col))
    }
    k[is.na(col)] <- '￿'
    k
  })
  do.call(order, unname(keys))
}

.webr_plural <- function(n) if (n == 1) '' else 's'

.webr_check_frame <- function(user, expected, ordered) {
  u <- .webr_as_frame(user)
  if (is.null(u)) {
    return(list(pass = FALSE, reason = paste0(
      'result should be a data.frame or vector, got ', class(user)[1])))
  }
  e <- .webr_as_frame(expected)
  if (ncol(u) != ncol(e)) {
    return(list(pass = FALSE, reason = paste0(
      ncol(u), ' column', .webr_plural(ncol(u)), ' vs ', ncol(e), ' expected')))
  }
  if (nrow(u) != nrow(e)) {
    return(list(pass = FALSE, reason = paste0(
      nrow(u), ' row', .webr_plural(nrow(u)), ' vs ', nrow(e), ' expected')))
  }
  if (!ordered) {
    u <- u[.webr_canonical_order(u), , drop = FALSE]
    e <- e[.webr_canonical_order(e), , drop = FALSE]
  }
  for (j in seq_len(ncol(u))) {
    eq <- .webr_col_equal(u[[j]], e[[j]])
    # an NA in eq (e.g. time vs unparseable string) means mismatch, never a crash
    eq[is.na(eq)] <- FALSE
    if (!all(eq)) {
      i <- which(!eq)[1]
      return(list(pass = FALSE, reason = paste0(
        'values differ at row ', i, ', column ', j)))
    }
  }
  list(pass = TRUE)
}

.webr_check_scalar <- function(user, expected) {
  if (is.data.frame(user)) {
    return(list(pass = FALSE, reason = 'result should be a single value, got a data.frame'))
  }
  if (!(is.atomic(user) && length(user) == 1)) {
    return(list(pass = FALSE, reason = paste0(
      'result should be a single value, got ', class(user)[1],
      ' of length ', length(user))))
  }
  if (isTRUE(all(.webr_col_equal(user, expected)))) list(pass = TRUE)
  else list(pass = FALSE, reason = 'value differs from expected')
}

.webr_fmt_cell <- function(v) {
  if (!is.atomic(v) || length(v) != 1) return(paste0('<', class(v)[1], '>'))
  if (is.na(v)) return(NA)
  if (inherits(v, 'POSIXt')) {
    if (format(v, '%H:%M:%S', tz = 'UTC') == '00:00:00') {
      return(format(v, '%Y-%m-%d', tz = 'UTC'))
    }
    return(format(v, '%Y-%m-%d %H:%M', tz = 'UTC'))
  }
  if (inherits(v, 'Date')) return(format(v, '%Y-%m-%d'))
  if (is.logical(v)) return(v)
  if (is.numeric(v)) {
    if (is.finite(v)) return(unclass(v))
    return(as.character(v))
  }
  substr(as.character(v), 1, 500)
}

# I() wrappers keep single-element vectors as JSON arrays under
# auto_unbox = TRUE (a 1-column frame must still render columns: ["x"]).
.webr_display <- function(obj) {
  df <- .webr_as_frame(obj)
  if (is.null(df)) return(list(kind = 'scalar', value = .webr_fmt_cell(obj)))
  total <- nrow(df)
  shown <- utils::head(df, .webr_head)
  rows <- lapply(seq_len(nrow(shown)), function(i) {
    I(lapply(seq_along(shown), function(j) .webr_fmt_cell(shown[[j]][i])))
  })
  list(kind = 'frame', columns = I(as.character(names(df))), rows = I(rows), total = total)
}

.webr_json <- function(payload) {
  as.character(jsonlite::toJSON(payload, auto_unbox = TRUE, na = 'null', null = 'null', digits = 10))
}

.webr_run_and_check <- function(user_code, solution_code, ordered, result_type) {
  payload <- list(error = NULL, stdout = '', user = NULL, expected = NULL, check = NULL)
  run <- .webr_run_user(user_code)
  out <- run$stdout
  if (nchar(out) > 8000) out <- substring(out, nchar(out) - 7999)
  payload$stdout <- out
  if (!is.null(run$error)) {
    payload$error <- run$error
    return(.webr_json(payload))
  }
  sol <- .webr_run_user(solution_code)
  if (!is.null(sol$error)) {
    payload$error <- paste0('internal: canonical solution failed - ', sol$error)
    return(.webr_json(payload))
  }
  expected <- get('result', envir = sol$env, inherits = FALSE)
  payload$expected <- .webr_display(expected)
  if (!exists('result', envir = run$env, inherits = FALSE)) {
    payload$check <- list(pass = FALSE, reason = 'assign your answer to a variable named result')
    return(.webr_json(payload))
  }
  user <- get('result', envir = run$env, inherits = FALSE)
  payload$user <- .webr_display(user)
  payload$check <- if (result_type == 'scalar') .webr_check_scalar(user, expected)
                   else .webr_check_frame(user, expected, ordered)
  .webr_json(payload)
}

.webr_build('/data')
`
