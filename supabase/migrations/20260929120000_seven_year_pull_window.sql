alter table settings drop constraint if exists settings_pull_window_days_check;

alter table settings
  add constraint settings_pull_window_days_check
  check (pull_window_days between 1 and 2558);
