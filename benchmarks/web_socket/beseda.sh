#!/bin/bash 
let I=0
while [ $I -lt 5 ]; do
	node beseda_subscribe.js &
	let I=I+1
done



