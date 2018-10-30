#!/bin/bash
# Make default camera /dev/video0 point to the "best" camera present.

if [ -h /dev/video0 ]; then 
   sudo rm /dev/video0   # not first run: remove our old symlink
elif [ -e /dev/video0 ]; then
   sudo mv /dev/video0 /dev/video0.original   # first run: rename original video0
fi 
if [ -e /dev/video1 ]; then
   sudo ln -s /dev/video1 /dev/video0   # symlink to video1 since it exists
   echo "Set default camera /dev/video0 --> external camera /dev/video1"
elif [ -e /dev/video0.original ]; then  # symlink to video0.original otherwise
   sudo ln -s /dev/video0.original /dev/video0
   echo "Set default camera /dev/video0 --> integrated camera /dev/video0.original"
else
   echo "Sorry, does this machine have no camera devices?"
   ls -l /dev/video*
fi