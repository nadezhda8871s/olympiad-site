#!/usr/bin/env python
import os
import sys

def main():
    # Если на Render задан DJANGO_SETTINGS_MODULE — он приоритетнее
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()
